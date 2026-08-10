import time
import httpx
import os
from dotenv import load_dotenv
from langgraph.types import interrupt
from app.state import WorkflowState
from app.graphql_client import insert_row

load_dotenv()

LLM_API_BASE_URL = os.getenv("LLM_API_BASE_URL", "")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")


def llm_call_node(state: WorkflowState) -> dict:
    step = state["steps"][state["current_step_index"]]
    step_id = step["id"]
    config = step.get("config", {})
    outputs = dict(state["step_outputs"])

    prompt = config.get("prompt", "")
    model = config.get("model", "meta/llama-3.1-8b-instruct")

    cfg_api_key = config.get("api_key")
    cfg_base_url = config.get("base_url")

    if cfg_api_key and cfg_base_url and str(cfg_api_key).strip() and str(cfg_base_url).strip():
        base_url = str(cfg_base_url).strip().rstrip("/")
        api_key = str(cfg_api_key).strip()
    else:
        base_url = LLM_API_BASE_URL.rstrip("/")
        api_key = LLM_API_KEY

    format_kwargs = {f"step_output_{k}": v for k, v in outputs.items()}
    try:
        prompt = prompt.format(**format_kwargs)
    except (KeyError, ValueError):
        pass

    attempt_count = 0
    last_error = None
    content = None

    for attempt in range(2):
        attempt_count = attempt + 1
        try:
            response = httpx.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}]},
                timeout=30,
            )
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"]
                last_error = None
                break
            else:
                err_text = response.text
                if api_key and api_key in err_text:
                    err_text = err_text.replace(api_key, "[REDACTED]")
                last_error = f"HTTP {response.status_code}: {err_text}"
        except httpx.HTTPError as e:
            err_text = str(e)
            if api_key and api_key in err_text:
                err_text = err_text.replace(api_key, "[REDACTED]")
            last_error = err_text
        if attempt == 0:
            time.sleep(1)

    if content is not None:
        outputs[step_id] = {"output": content, "attempt_count": attempt_count}
        return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1}
    else:
        outputs[step_id] = {"error": last_error, "attempt_count": attempt_count}
        return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1, "status": "failed", "error": last_error}


def http_request_node(state: WorkflowState) -> dict:
    step = state["steps"][state["current_step_index"]]
    step_id = step["id"]
    config = step.get("config", {})
    outputs = dict(state["step_outputs"])

    url = config.get("url", "")
    method = config.get("method", "GET")
    headers = config.get("headers", {})
    body = config.get("body", None)

    attempt_count = 0
    last_error = None
    result = None

    for attempt in range(2):
        attempt_count = attempt + 1
        try:
            response = httpx.request(method, url, headers=headers, json=body, timeout=10)
            if response.status_code < 500:
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    output = response.json()
                else:
                    output = response.text
                result = {"status_code": response.status_code, "output": output, "attempt_count": attempt_count}
                last_error = None
                break
            else:
                last_error = f"HTTP {response.status_code}: {response.text}"
        except httpx.HTTPError as e:
            last_error = str(e)
        if attempt == 0:
            time.sleep(1)

    if result is not None:
        outputs[step_id] = result
        return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1}
    else:
        outputs[step_id] = {"error": last_error, "attempt_count": attempt_count}
        return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1, "status": "failed", "error": last_error}


def db_write_node(state: WorkflowState) -> dict:
    step = state["steps"][state["current_step_index"]]
    step_id = step["id"]
    config = step.get("config", {})
    outputs = dict(state["step_outputs"])

    table = config.get("table", "")
    data = config.get("data", {})

    allowed_tables = {"workflow_runs", "step_runs"}
    if table not in allowed_tables:
        err = f"table '{table}' not allowed for db_write"
        outputs[step_id] = {"error": err, "attempt_count": 1}
        return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1, "status": "failed", "error": err}

    try:
        result = insert_row(table, data)
        inserted_id = result["data"][f"insert_{table}_one"]["id"]
        outputs[step_id] = {"inserted_id": inserted_id, "attempt_count": 1}
        return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1}
    except Exception as e:
        err = str(e)
        outputs[step_id] = {"error": err, "attempt_count": 1}
        return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1, "status": "failed", "error": err}


def notify_node(state: WorkflowState) -> dict:
    step = state["steps"][state["current_step_index"]]
    step_id = step["id"]
    config = step.get("config", {})
    outputs = dict(state["step_outputs"])

    message = config.get("message", "")
    channel = config.get("channel", "console")

    if channel == "console":
        print(f"[NOTIFY] {message}")
        outputs[step_id] = {"sent": True, "channel": "console"}
    else:
        print(f"[NOTIFY-UNSUPPORTED] {message}")
        outputs[step_id] = {"sent": False, "channel": channel, "note": "unsupported channel, logged only"}

    return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1}


def conditional_branch_node(state: WorkflowState) -> dict:
    step = state["steps"][state["current_step_index"]]
    step_id = step["id"]
    config = step.get("config", {})
    outputs = dict(state["step_outputs"])

    condition_key = config.get("condition_key", "")
    operator = config.get("operator", "eq")
    value = config.get("value", "")
    on_true_note = config.get("on_true_note", "")
    on_false_note = config.get("on_false_note", "")

    prior = outputs.get(condition_key, {})
    test_value = prior.get("output", "") if isinstance(prior, dict) else ""
    if test_value is None:
        test_value = ""

    if operator == "eq":
        result = str(test_value) == str(value)
    elif operator == "contains":
        result = str(value) in str(test_value)
    else:
        result = False

    outputs[step_id] = {"condition_result": result, "note": on_true_note if result else on_false_note}
    return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1}


def approval_gate_node(state: WorkflowState) -> dict:
    step = state["steps"][state["current_step_index"]]
    step_id = step["id"]
    config = step.get("config", {})
    outputs = dict(state["step_outputs"])

    required_role = config.get("required_role", "owner")

    resume_value = interrupt({"step_id": step_id, "required_role": required_role, "message": "Awaiting approval"})

    approved = resume_value.get("approved", False)
    approved_by = resume_value.get("approved_by", "")

    outputs[step_id] = {"approved": approved, "approved_by": approved_by}

    if not approved:
        return {
            "step_outputs": outputs,
            "current_step_index": state["current_step_index"] + 1,
            "status": "failed",
            "error": "approval rejected",
        }

    return {"step_outputs": outputs, "current_step_index": state["current_step_index"] + 1}
