from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from langgraph.types import Command
from app.graphql_client import hasura_request, update_step_run, update_workflow_run_status, insert_row
from app.graph.builder import build_graph

router = APIRouter()


def _get_org_member_role(workflow_id: str, user_id: str):
    org_q = """
    query GetWorkflowOrg($workflow_id: uuid!) {
        workflows_by_pk(id: $workflow_id) {
            org_id
            organization {
                quota_limit
                quota_used
            }
        }
    }
    """
    member_q = """
    query GetMember($org_id: uuid!, $user_id: uuid!) {
        org_members(where: {org_id: {_eq: $org_id}, user_id: {_eq: $user_id}}) {
            role
        }
    }
    """
    org_data = hasura_request(org_q, {"workflow_id": workflow_id})
    wf = org_data["data"]["workflows_by_pk"]
    if not wf:
        raise HTTPException(status_code=404, detail="workflow not found")
    org_id = wf["org_id"]
    org = wf["organization"]
    member_data = hasura_request(member_q, {"org_id": org_id, "user_id": user_id})
    members = member_data["data"]["org_members"]
    return org_id, org, members[0]["role"] if members else None


def _get_run_org_member_role(workflow_run_id: str, user_id: str):
    run_q = """
    query GetRunOrg($workflow_run_id: uuid!) {
        workflow_runs_by_pk(id: $workflow_run_id) {
            workflow {
                org_id
                organization {
                    quota_limit
                    quota_used
                }
            }
        }
    }
    """
    member_q = """
    query GetMember($org_id: uuid!, $user_id: uuid!) {
        org_members(where: {org_id: {_eq: $org_id}, user_id: {_eq: $user_id}}) {
            role
        }
    }
    """
    run_data = hasura_request(run_q, {"workflow_run_id": workflow_run_id})
    wr = run_data["data"]["workflow_runs_by_pk"]
    if not wr:
        raise HTTPException(status_code=404, detail="workflow run not found")
    org_id = wr["workflow"]["org_id"]
    org = wr["workflow"]["organization"]
    member_data = hasura_request(member_q, {"org_id": org_id, "user_id": user_id})
    members = member_data["data"]["org_members"]
    return org_id, org, members[0]["role"] if members else None


def _determine_final_status(graph, final_state: dict, config: dict) -> str:
    graph_state = graph.get_state(config)
    if graph_state.next:
        return "paused"
    for v in final_state.get("step_outputs", {}).values():
        if isinstance(v, dict) and "error" in v:
            return "failed"
    return "completed"


def _update_step_runs_from_outputs(step_runs_map: dict, step_outputs: dict):
    for step_id, output in step_outputs.items():
        step_run_id = step_runs_map.get(step_id)
        if not step_run_id:
            continue
        has_error = isinstance(output, dict) and "error" in output
        status = "failed" if has_error else "completed"
        error_val = output.get("error") if has_error else None
        update_step_run(step_run_id, status, output=output, error=error_val)


def _increment_quota(org_id: str):
    mutation = """
    mutation IncrementQuota($org_id: uuid!) {
        update_organizations_by_pk(pk_columns: {id: $org_id}, _inc: {quota_used: 1}) {
            id
        }
    }
    """
    hasura_request(mutation, {"org_id": org_id})


def execute_workflow_run(workflow_id: str, user_id: str) -> dict:
    org_q = """
    query GetWorkflowOrg($workflow_id: uuid!) {
        workflows_by_pk(id: $workflow_id) {
            org_id
            organization {
                quota_limit
                quota_used
            }
        }
    }
    """
    org_data = hasura_request(org_q, {"workflow_id": workflow_id})
    wf = org_data["data"]["workflows_by_pk"]
    if not wf:
        raise HTTPException(status_code=404, detail="workflow not found")
    org_id = wf["org_id"]
    org = wf["organization"]

    if org["quota_used"] >= org["quota_limit"]:
        raise HTTPException(status_code=403, detail="organization quota exhausted")

    steps_q = """
    query GetSteps($workflow_id: uuid!) {
        workflow_steps(where: {workflow_id: {_eq: $workflow_id}}, order_by: {step_order: asc}) {
            id
            type
            config
            step_order
        }
        workflow_triggers(where: {workflow_id: {_eq: $workflow_id}}) {
            id
            type
            config
        }
    }
    """
    steps_data = hasura_request(steps_q, {"workflow_id": workflow_id})
    workflow_steps = steps_data["data"]["workflow_steps"]

    run_result = insert_row("workflow_runs", {
        "workflow_id": workflow_id,
        "status": "running",
        "started_by": user_id,
    })
    workflow_run_id = run_result["data"]["insert_workflow_runs_one"]["id"]

    step_runs_map = {}
    for step in workflow_steps:
        sr_result = insert_row("step_runs", {
            "workflow_run_id": workflow_run_id,
            "step_id": step["id"],
            "status": "pending",
        })
        step_runs_map[step["id"]] = sr_result["data"]["insert_step_runs_one"]["id"]

    initial_state = {
        "workflow_run_id": workflow_run_id,
        "org_id": org_id,
        "steps": [
            {"id": s["id"], "type": s["type"], "config": s["config"], "step_order": s["step_order"]}
            for s in workflow_steps
        ],
        "current_step_index": 0,
        "step_outputs": {},
        "status": "running",
        "error": None,
    }

    graph = build_graph()
    config = {"configurable": {"thread_id": workflow_run_id}}
    final_state = graph.invoke(initial_state, config=config)

    _update_step_runs_from_outputs(step_runs_map, final_state.get("step_outputs", {}))

    final_status = _determine_final_status(graph, final_state, config)
    if final_status == "completed":
        _increment_quota(org_id)
    if final_status == "paused":
        curr_idx = final_state.get("current_step_index", 0)
        if curr_idx < len(workflow_steps):
            paused_step_id = workflow_steps[curr_idx]["id"]
            paused_sr_id = step_runs_map.get(paused_step_id)
            if paused_sr_id:
                update_step_run(paused_sr_id, "paused")
    update_workflow_run_status(workflow_run_id, final_status)

    return {"workflow_run_id": workflow_run_id, "status": final_status}


@router.post("/trigger-workflow-run")
def trigger_workflow_run(payload: dict):
    session_variables = payload.get("session_variables", {})
    user_id = session_variables.get("x-hasura-user-id", "")
    workflow_id = payload["input"]["workflow_id"]

    org_id, org, role = _get_org_member_role(workflow_id, user_id)

    if role is None:
        raise HTTPException(status_code=403, detail="not a member of this organization")
    if role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="insufficient role to trigger workflow")
    if org["quota_used"] >= org["quota_limit"]:
        raise HTTPException(status_code=403, detail="organization quota exhausted")

    return execute_workflow_run(workflow_id, user_id)


@router.post("/approve-step")
def approve_step(payload: dict):
    session_variables = payload.get("session_variables", {})
    user_id = session_variables.get("x-hasura-user-id", "")
    workflow_run_id = payload["input"]["workflow_run_id"]
    approved = payload["input"]["approved"]

    org_id, org, role = _get_run_org_member_role(workflow_run_id, user_id)

    if role is None:
        raise HTTPException(status_code=403, detail="not a member of this organization")
    if role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="insufficient role to approve")

    graph = build_graph()
    config = {"configurable": {"thread_id": workflow_run_id}}
    final_state = graph.invoke(
        Command(resume={"approved": approved, "approved_by": user_id}),
        config=config,
    )

    step_outputs = final_state.get("step_outputs", {})
    for step_id, output in step_outputs.items():
        if isinstance(output, dict) and "approved" in output:
            sr_q = """
            query GetStepRun($workflow_run_id: uuid!, $step_id: uuid!) {
                step_runs(where: {workflow_run_id: {_eq: $workflow_run_id}, step_id: {_eq: $step_id}}) {
                    id
                }
            }
            """
            sr_data = hasura_request(sr_q, {"workflow_run_id": workflow_run_id, "step_id": step_id})
            rows = sr_data["data"]["step_runs"]
            if rows:
                step_run_id = rows[0]["id"]
                has_error = "error" in output
                status = "failed" if has_error else "completed"
                update_step_run(step_run_id, status, output=output, error=output.get("error"))
                approve_mutation = """
                mutation SetApproval($id: uuid!, $approved_by: uuid!, $approved_at: timestamptz!) {
                    update_step_runs_by_pk(pk_columns: {id: $id}, _set: {approved_by: $approved_by, approved_at: $approved_at}) {
                        id
                    }
                }
                """
                hasura_request(approve_mutation, {
                    "id": step_run_id,
                    "approved_by": user_id,
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                })

    final_status = _determine_final_status(graph, final_state, config)
    update_workflow_run_status(workflow_run_id, final_status)
    if final_status == "completed":
        _increment_quota(org_id)

    return {"workflow_run_id": workflow_run_id, "status": final_status}

