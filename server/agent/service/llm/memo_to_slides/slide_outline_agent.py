from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockModelSettings
from dataclasses import dataclass
from pydantic import BaseModel, Field


from ..base import model


@dataclass
class SlideOutlineDependencies:
    memo: str
    all_question_text: str
    default_prompt: str


class PowerpointOutline(BaseModel):
    slides: list[str] = Field(description="List of included powerpoint slides")


slide_outline_agent = Agent(
    model,
    deps_type=SlideOutlineDependencies,
    output_type=PowerpointOutline,
    model_settings=BedrockModelSettings(
        temperature=0.2,
        bedrock_additional_model_requests_fields={
            "reasoning_effort": "high"
        }
    ),
)


@slide_outline_agent.system_prompt
async def add_system_prompt(ctx: RunContext[SlideOutlineDependencies]):
    append_string = ctx.deps.default_prompt
    append_string += f"\nHere is the full memo:\n{ctx.deps.memo}"
    append_string += f"\nFor reference, here is the conducted survey:\n{ctx.deps.all_question_text}"
    return append_string
