from datetime import datetime, timezone
from app.graphql_client import hasura_request
from app.actions import execute_workflow_run


def run_scheduled_check() -> dict:
    triggers_q = """
    query GetScheduledTriggers {
        workflow_triggers(where: {type: {_eq: "scheduled"}}) {
            id
            config
            workflow {
                id
                created_by
            }
        }
    }
    """
    data = hasura_request(triggers_q, {})
    triggers = data["data"]["workflow_triggers"]

    checked = 0
    fired = 0

    now = datetime.now(timezone.utc)

    for trigger in triggers:
        checked += 1
        config = trigger.get("config", {})
        workflow = trigger.get("workflow", {})
        workflow_id = workflow.get("id")
        created_by = workflow.get("created_by")
        cron_interval_minutes = config.get("cron_interval_minutes")
        cron_last_run = config.get("cron_last_run")

        if not workflow_id or not cron_interval_minutes:
            continue

        should_fire = False
        if cron_last_run is None:
            should_fire = True
        else:
            try:
                last_run_dt = datetime.fromisoformat(cron_last_run.replace("Z", "+00:00"))
                elapsed_minutes = (now - last_run_dt).total_seconds() / 60
                if elapsed_minutes >= cron_interval_minutes:
                    should_fire = True
            except (ValueError, AttributeError):
                should_fire = True

        if not should_fire:
            continue

        try:
            execute_workflow_run(workflow_id, created_by)
            fired += 1
        except Exception:
            pass

        new_config = dict(config)
        new_config["cron_last_run"] = now.isoformat()

        update_q = """
        mutation UpdateTriggerConfig($id: uuid!, $config: jsonb!) {
            update_workflow_triggers_by_pk(pk_columns: {id: $id}, _set: {config: $config}) {
                id
            }
        }
        """
        try:
            hasura_request(update_q, {"id": trigger["id"], "config": new_config})
        except Exception:
            pass

    return {"checked": checked, "fired": fired}

