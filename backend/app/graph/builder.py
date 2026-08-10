from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from app.state import WorkflowState
from app.graph.nodes import (
    llm_call_node,
    http_request_node,
    db_write_node,
    notify_node,
    conditional_branch_node,
    approval_gate_node,
)

_checkpointer = MemorySaver()


def route_step(state: WorkflowState) -> str:
    if state["current_step_index"] >= len(state["steps"]):
        return "end"
    if state["status"] == "paused":
        return "end"
    return state["steps"][state["current_step_index"]]["type"]


def build_graph():
    graph = StateGraph(WorkflowState)

    graph.add_node("router", lambda state: {})
    graph.add_node("llm_call", llm_call_node)
    graph.add_node("http_request", http_request_node)
    graph.add_node("db_write", db_write_node)
    graph.add_node("notify", notify_node)
    graph.add_node("conditional_branch", conditional_branch_node)
    graph.add_node("approval_gate", approval_gate_node)

    graph.set_entry_point("router")

    graph.add_conditional_edges(
        "router",
        route_step,
        {
            "llm_call": "llm_call",
            "http_request": "http_request",
            "db_write": "db_write",
            "notify": "notify",
            "conditional_branch": "conditional_branch",
            "approval_gate": "approval_gate",
            "end": END,
        },
    )

    for node in ("llm_call", "http_request", "db_write", "notify", "conditional_branch", "approval_gate"):
        graph.add_edge(node, "router")

    return graph.compile(checkpointer=_checkpointer)
