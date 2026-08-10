from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langgraph.types import Command
from app.graph.builder import build_graph
from app.actions import router as actions_router, execute_workflow_run
from app.scheduled import run_scheduled_check

app = FastAPI()


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail, "detail": exc.detail},
    )


app.include_router(actions_router, prefix="/actions")


@app.get("/health")
def health():
    return {"status": "ok"}


class ExecuteStubRequest(BaseModel):
    workflow_run_id: str
    org_id: str
    steps: list


def _build_response(graph, final_state: dict, config: dict) -> dict:
    response = dict(final_state)
    graph_state = graph.get_state(config)
    if graph_state.next:
        response["status"] = "paused"
        interrupts = graph_state.tasks[0].interrupts if graph_state.tasks else []
        response["pending_approval"] = interrupts[0].value if interrupts else None
    return response


@app.post("/internal/execute-stub")
def execute_stub(request: ExecuteStubRequest):
    graph = build_graph()
    initial_state = {
        "workflow_run_id": request.workflow_run_id,
        "org_id": request.org_id,
        "steps": request.steps,
        "current_step_index": 0,
        "step_outputs": {},
        "status": "running",
        "error": None,
    }
    config = {"configurable": {"thread_id": request.workflow_run_id}}
    final_state = graph.invoke(initial_state, config=config)
    return _build_response(graph, final_state, config)


class ResumeExecutionRequest(BaseModel):
    workflow_run_id: str
    approved: bool
    approved_by: str


@app.post("/internal/resume-execution")
def resume_execution(request: ResumeExecutionRequest):
    graph = build_graph()
    config = {"configurable": {"thread_id": request.workflow_run_id}}
    final_state = graph.invoke(
        Command(resume={"approved": request.approved, "approved_by": request.approved_by}),
        config=config,
    )
    return _build_response(graph, final_state, config)


@app.get("/internal/run-scheduled-check")
def scheduled_check_endpoint():
    return run_scheduled_check()


@app.post("/internal/handle-db-event")
def handle_db_event(payload: dict):
    try:
        event = payload.get("event", {})
        op = event.get("op", "")
        new_row = event.get("data", {}).get("new", {})
        if op == "INSERT" and new_row.get("type") == "database_event":
            workflow_id = new_row.get("workflow_id")
            if workflow_id:
                wf_q = """
                query GetWorkflowCreator($id: uuid!) {
                    workflows_by_pk(id: $id) {
                        created_by
                    }
                }
                """
                from app.graphql_client import hasura_request
                wf_data = hasura_request(wf_q, {"id": workflow_id})
                wf = wf_data["data"]["workflows_by_pk"]
                created_by = wf["created_by"] if wf else None
                if created_by:
                    execute_workflow_run(workflow_id, created_by)
    except Exception:
        pass
    return {"received": True}
