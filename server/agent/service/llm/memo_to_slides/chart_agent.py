from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockModelSettings
from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from ..base import model
from service.slides.chartkit import ChartKind, ToplineSpec, CrosstabSpec

@dataclass
class ChartDependencies:
    all_toplines_text: str


# class ChartKind(str, Enum):
#     COLUMN = "COLUMN"
#     BAR = "BAR"
#     STACKED_COLUMN = "STACKED_COLUMN"
#     STACKED_BAR = "STACKED_BAR"
#     PIE = "PIE"
#
#
# @dataclass
# class ChartRequest:
#     title: str
#     dataset: DatasetSpec
#     kind: ChartKind


class ChartSpecification(BaseModel):
    title: str = Field(default="", description="Title for the chart")
    shortened_name: str = Field(description="Question name to be used in chart")
    # shortened_name_answers: Optional[list[str]] = Field(default=None, description="List of answers to keep from the question, optional")
    crosstab_shortened_name: Optional[str] = Field(default=None, description="Question name to cross with only if we want crosstab data, optional")
    # shortened_name_crosstab_answers: Optional[list[str]] = Field(default=None, description="List of answers to keep from the crosstab question, optional")
    kind: ChartKind = Field(description="What kind of chart is being made")


system_prompt = (
    "You work for a political consultant who has described what he wants in a chart. "
    "You'll be given a description of the chart and a copy of the original survey "
    "to reference. You can select one question shortened name (for topline data) or provide a second (for crosstab data) "
    " and the data will automatically be added to the chart. Finally the kind of chart has to be selected from the following options: \n"
)

chart_kind_string = '\n'.join([kind for kind in ChartKind])


chart_agent = Agent(
    model,
    deps_type=ChartDependencies,
    output_type=ChartSpecification,
    system_prompt=system_prompt,
    model_settings=BedrockModelSettings(
        temperature=0.2,
        bedrock_additional_model_requests_fields={
            "reasoning_effort": "high"
        }
    ),
)


@chart_agent.system_prompt
async def add_topline_to_prompt(ctx: RunContext[ChartDependencies]):
    return f"\nHere is the full survey text:\n{ctx.deps.all_toplines_text}"
