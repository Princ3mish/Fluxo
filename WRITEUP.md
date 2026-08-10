# Architectural & Engineering Write-Up

## 1. Schema Reasoning

The data model is structured around a strict hierarchy: `organizations` → `org_members` → `workflows` → (`workflow_steps`, `workflow_triggers`) → `workflow_runs` → `step_runs`.

- **Multi-Tenant Membership**: `role` (`owner`, `editor`, `viewer`) is explicitly modeled on the join table `org_members` rather than on `auth.users`. This enables multi-tenancy where a single authenticated identity holds distinct administrative or read-only privileges across different organizational boundaries.
- **Workflow Definitions & Runs**: Workflows belong to an organization and define discrete steps and triggers. Each execution spawns a `workflow_runs` record tracking overarching state (`running`, `paused`, `completed`, `failed`), while individual `step_runs` capture granular execution details (input/output payloads, retry attempts, approval metadata, and execution duration).
- **JSONB Step & Trigger Configuration**: Instead of creating a separate table per step type (`llm_steps`, `http_steps`, `db_steps`), step configurations and trigger parameters are stored as `jsonb`. This avoids polymorphic join overhead and schema churn as new agent steps are introduced, while allowing PostgreSQL JSON operators and Hasura to query into configuration keys when necessary.

## 2. How the Two Permission Layers Are Enforced Differently

Fluxo enforces authorization across two distinct, complementary layers:

- **Layer 1: Hasura Row-Level Security (RLS)**: Enforced declaratively by the Hasura engine on direct GraphQL operations. Every `select`, `insert`, `update`, and `delete` rule joins through `org_members` against `X-Hasura-User-Id` and checks the member's `role`. Viewers have read-only access to organization workflows and run histories; Editors and Owners can author workflows.
- **Layer 2: Step-Level Gating & Runtime Authorization**:
  - *Database & Trigger Restrictions*: Specific step and trigger types have heightened authorization policies. In Hasura, `insert` permissions on `workflow_triggers` and `workflow_steps` use boolean `_or` filters to restrict sensitive actions (such as configuring outbound `webhook` triggers or writing to restricted database targets) strictly to users with the `owner` role.
  - *Runtime Action Authorization*: The `approval_gate` resume decision cannot be modeled as a static database access rule because it is a stateful runtime event. When `approveStep` is invoked via a Hasura Action, the FastAPI execution handler intercepts the request, queries the organization membership of the caller via admin client, and verifies that the user holds an `owner` or `editor` role before allowing the paused graph execution to resume.

## 3. How Approval-Gate Pause/Resume Is Implemented

Fluxo implements Human-in-the-Loop checkpointing using LangGraph's state machine engine:

- **Graph Interruption**: When execution reaches an `approval_gate` node, the node calls `interrupt({"step_id": step_id, "required_role": required_role, "message": "Awaiting approval"})`. This halts graph progression without raising an unhandled exception or blocking worker threads.
- **Thread Checkpointing**: The graph is initialized with a checkpointer configured using `thread_id = workflow_run_id`. Upon interruption, LangGraph serializes the full execution state (accumulated `step_outputs`, `current_step_index`, and pending graph edges) to the checkpointer. The backend updates the database row `step_runs.status = 'paused'` and `workflow_runs.status = 'paused'`.
- **Resuming Execution**: When an authorized user submits an approval or rejection via the frontend UI, Hasura forwards the `approveStep` mutation to the backend. The handler re-validates the user's role and calls:
  ```python
  graph.invoke(
      Command(resume={"approved": approved, "approved_by": user_id}),
      config={"configurable": {"thread_id": workflow_run_id}},
  )
  ```
  LangGraph loads the checkpoint for `thread_id`, injects the resume payload directly into `approval_gate_node`, and executes downstream nodes to completion.
- **Development Finding & Checkpointer Persistence**: During development, an early bug caused the checkpointer instance to be instantiated per-request inside route handlers, resulting in lost thread history between `trigger_workflow_run` and `approve_step`. This was resolved by registering the checkpointer as a shared application-level singleton. In this implementation, `MemorySaver` is used for in-process checkpointing; for full zero-downtime persistence across backend restarts, this is designed to be swapped with `PostgresSaver`.
