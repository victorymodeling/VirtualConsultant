from dataclasses import dataclass
from logging import getLogger

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockModelSettings
import re

from ..base import model
from service.data.datasource import ReportingSurveyDataSource


logger = getLogger(__name__)

MAX_CROSSTAB_NUM = 15

@dataclass
class TextBlockDependencies:
    datasource: ReportingSurveyDataSource
    insight: str
    default_prompt: str
    crosstab_requests: int = MAX_CROSSTAB_NUM


class TextOutput(BaseModel):
    descriptive_text: str = Field(description="Full text block with inserted statistics")


text_block_agent = Agent(
    model,
    deps_type=TextBlockDependencies,
    output_type=TextOutput,
    model_settings=BedrockModelSettings(
        temperature=0.2,
        bedrock_additional_model_requests_fields={
            "reasoning_effort": "high"
        }
    ),
)


@text_block_agent.system_prompt
async def append_data_to_prompt(ctx: RunContext[TextBlockDependencies]) -> str:
    append_string = ctx.deps.default_prompt
    append_string += f"\nThe question text for the survey is as follows:\n"
    append_string += ctx.deps.datasource.all_question_text()

    return append_string.strip()


@text_block_agent.tool
async def get_topline_data(ctx: RunContext[TextBlockDependencies], short_name: str) -> str:
    """
        Retrieves the topline survey results based on the shortened name.

        Args:
            short_name (str): The short name for the question.
        Returns:
            str: A formatted string representation of the topline results.
        """
    try:
        logger.info(f"LLM requested topline for {short_name}")
        topline_data = ctx.deps.datasource.topline_text(short_name)
        return topline_data
    except KeyError:
        logger.info(f"No topline for {short_name}")
        if not re.sub(r'^Q\d{1,2}', '', short_name).strip():
            return "I couldn't find a match but you're not using the full, exact short name. Please use the full short name and try again."
        return "I couldn't find any question with that short name, if you're sure you used the exact short name the topline might not exist."


@text_block_agent.tool
async def get_crosstab_data(ctx: RunContext[TextBlockDependencies], short_name: str, by_short_name: str) -> str:
    """
        Retrieves the crosstabulated survey results based on the provided shortened names.

        Args:
            short_name (str): The short name for the vertical axis question.
            by_short_name (str): The short name for the horizontal axis question.

        Returns:
            str: A formatted string representation of the crosstab results.
    """
    if ctx.deps.crosstab_requests <= 0:
        return "You've requested too many crosstabs, please return a text block using existing data."
    ctx.deps.crosstab_requests -= 1
    try:
        logger.info(
            f"LLM requested crosstab ({MAX_CROSSTAB_NUM - ctx.deps.crosstab_requests}/{MAX_CROSSTAB_NUM}): "
            f"{short_name} x {by_short_name}"
        )
        crosstab_data = ctx.deps.datasource.crosstab_text(short_name, by_short_name)
        return crosstab_data
    except KeyError:
        logger.info(f"No crosstab for {short_name} x {by_short_name}")
        if not re.sub(r'^Q\d{1,2}', '', short_name).strip() or not re.sub(r'^Q\d{1,2}', '', by_short_name).strip():
            return "You're not using full, exact short names. Please use the full short name and try again."
        return "I couldn't find the crosstab with those short names, if you're sure you used the exact short name the crosstab might not exist."
