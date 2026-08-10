from typing import TypedDict

class WorkflowState(TypedDict):
    workflow_run_id: str
    org_id: str
    steps: list
    current_step_index: int
    step_outputs: dict
    status: str
    error: str | None
