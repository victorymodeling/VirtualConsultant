import logging

from pydantic import ValidationError

from callbacks import TaskManager
from callbacks.task.artifact_schema import Artifact
from service.llm.memo_to_fact_check.memo_to_fact_check_agent import MemoToFactCheckAgent
from ..schema.fact_check import FactCheck as FactCheckSchema

logger = logging.getLogger(__name__)

ROUTING_KEY = "task.fact_check"

async def handle(body):
    try:
        fact_check_schema = FactCheckSchema.model_validate_json(body)
        logger.info("task.fact_check: %s", fact_check_schema.model_dump_json())
    except ValidationError as e:
        logger.error("task.fact_check body didn't validate: %r", body)
        return

    with TaskManager(fact_check_schema.task_id) as task_manager:
        fact_check_agent = MemoToFactCheckAgent(
            fact_check_schema.kbid,
            fact_check_schema.key_number,
            fact_check_schema.doc_id,
            progress_callback=task_manager
        )
        fact_checks = await fact_check_agent.fact_check_memo()
        total_tokens = fact_check_agent.usage.input_tokens + fact_check_agent.usage.output_tokens * 3
        for fact_check in fact_checks:
            task_manager.add_artifact(Artifact(
                resource_type='FactCheck',
                action='Edit',
                total_tokens=total_tokens,
                payload=fact_check.to_json()
            ))
            logger.info(f"Generated fact check for {fact_check_schema.kbid}")
    return