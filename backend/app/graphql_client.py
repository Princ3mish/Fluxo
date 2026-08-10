import httpx
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

HASURA_GRAPHQL_ENDPOINT = os.getenv("HASURA_GRAPHQL_ENDPOINT")
HASURA_ADMIN_SECRET = os.getenv("HASURA_ADMIN_SECRET")


def hasura_request(query: str, variables: dict) -> dict:
    response = httpx.post(
        HASURA_GRAPHQL_ENDPOINT,
        headers={
            "X-Hasura-Admin-Secret": HASURA_ADMIN_SECRET,
            "Content-Type": "application/json",
        },
        json={"query": query, "variables": variables},
    )
    data = response.json()
    if "errors" in data:
        raise Exception(data["errors"])
    return data


def update_step_run(step_run_id: str, status: str, output: dict = None, error: str = None) -> dict:
    mutation = """
    mutation UpdateStepRun($id: uuid!, $status: String!, $output: jsonb, $error: String, $finished_at: timestamptz) {
        update_step_runs_by_pk(pk_columns: {id: $id}, _set: {status: $status, output: $output, error: $error, finished_at: $finished_at}) {
            id
        }
    }
    """
    finished_at = datetime.now(timezone.utc).isoformat() if status in ("completed", "failed") else None
    variables = {
        "id": step_run_id,
        "status": status,
        "output": output,
        "error": error,
        "finished_at": finished_at,
    }
    return hasura_request(mutation, variables)


def update_workflow_run_status(workflow_run_id: str, status: str) -> dict:
    mutation = """
    mutation UpdateWorkflowRun($id: uuid!, $status: String!, $finished_at: timestamptz) {
        update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: {status: $status, finished_at: $finished_at}) {
            id
        }
    }
    """
    finished_at = datetime.now(timezone.utc).isoformat() if status in ("completed", "failed") else None
    variables = {
        "id": workflow_run_id,
        "status": status,
        "finished_at": finished_at,
    }
    return hasura_request(mutation, variables)


def insert_row(table: str, data: dict) -> dict:
    mutation = f"""
    mutation InsertRow($object: {table}_insert_input!) {{
        insert_{table}_one(object: $object) {{
            id
        }}
    }}
    """
    return hasura_request(mutation, {"object": data})

