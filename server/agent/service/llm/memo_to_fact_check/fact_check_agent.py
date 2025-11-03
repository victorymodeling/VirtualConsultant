from typing import Optional
from dataclasses import dataclass
from logging import getLogger

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
import re

from ..base import model
from service.data.datasource import ReportingSurveyDataSource


logger = getLogger(__name__)

@dataclass
class FactCheckDependencies:
    datasource: ReportingSurveyDataSource


class FactCheckOutput(BaseModel):
    is_factual: bool = Field(description="True if claim is backed up by survey, false if not")
    supporting_questions: list[str] = Field(description="List of crosstab and topline questions that back up the claim")
    correction: str = Field(description="Direct quoting of survey data with relevant statistic proving or disproving the claim")

fact_check_agent = Agent(
    model,
    deps_type=FactCheckDependencies,
    output_type=FactCheckOutput,
    system_prompt=("""
        You're fact checking a written report. You're doing it one claim at a time. The report is analyzing a survey we conducted.
        Most numbers provided should have the question they're referencing listed. The numbers could be wrong.
        You have access to the full survey including topline and crosstab results, you can fetch the stats as needed to verify claims.
        Once you find the numbers backing up a claim, mark it as factual and return the supporting topline and/or crosstab questions.
        If a claim clearly references a question and the numbers do not match, please attach those short names as well.
        Make sure to check a crosstab both ways, if Question A x Question B doesn't match, look at Question B x Question A. If either matches the question is factual.
        Request all relevant data and try to match the stats up to the survey. Try looking at a few options if a match isn't found right away.
        Do no list any supporting questions you did not personally request and look at the numbers for. Take your time and request all the data you need.
    """)
)


@fact_check_agent.system_prompt
async def append_data_to_prompt(ctx: RunContext[FactCheckDependencies]) -> str:
    append_string = f"\nThe data collected from the survey is as follows:\n"
    append_string += ctx.deps.datasource.all_question_text()

    return append_string.strip()


@fact_check_agent.tool
async def get_topline_data(ctx: RunContext[FactCheckDependencies], short_name: str) -> str:
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


@fact_check_agent.tool
async def get_crosstab_data(ctx: RunContext[FactCheckDependencies], short_name: str, by_short_name: str) -> str:
    """
        Retrieves the crosstabulated survey results based on the provided shortened names.

        Args:
            short_name (str): The short name for the vertical axis question.
            by_short_name (str): The short name for the horizontal axis question.

        Returns:
            str: A formatted string representation of the crosstab results.
    """
    try:
        logger.info(f"LLM requested crosstab for {short_name} x {by_short_name}")
        crosstab_data = ctx.deps.datasource.crosstab_text(short_name, by_short_name)
        return crosstab_data
    except KeyError:
        logger.info(f"No crosstab for {short_name} x {by_short_name}")
        if not re.sub(r'^Q\d{1,2}', '', short_name).strip() or not re.sub(r'^Q\d{1,2}', '', by_short_name).strip():
            return "You're not using full, exact short names. Please use the full short name and try again."
        return "I couldn't find the crosstab with those short names, if you're sure you used the exact short name the crosstab might not exist."
