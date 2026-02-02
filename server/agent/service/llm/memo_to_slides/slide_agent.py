from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockModelSettings
from dataclasses import dataclass
from pydantic import BaseModel, Field
from typing import Optional

from ..base import model

@dataclass
class SlideDependencies:
    all_question_text: str
    default_prompt: str


class SlideSpecification(BaseModel):
    title: Optional[str] = Field(default="", description="Optional Title for the slide")
    bullet_points: Optional[list[str]] = Field(default=[], description="Optional list of bullet points for the slide")
    charts: Optional[list[str]] = Field(default=[], description="Optional list of charts for the slide")


slide_agent = Agent(
    model,
    deps_type=SlideDependencies,
    output_type=SlideSpecification,
    model_settings=BedrockModelSettings(
        temperature=0.2,
        bedrock_additional_model_requests_fields={
            "reasoning_effort": "high"
        }
    ),
)


@slide_agent.system_prompt
async def add_topline_to_prompt(ctx: RunContext[SlideDependencies]):
    append_string = ctx.deps.default_prompt
    append_string += f"\nHere is the full survey text:\n{ctx.deps.all_question_text}"
    return append_string
