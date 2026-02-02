from dataclasses import dataclass
from logging import getLogger

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockModelSettings

from ..base import model


logger = getLogger(__name__)

@dataclass
class MemoDependencies:
    memo_focus: str
    default_prompt: str


# class MemoOutput(BaseModel):
#     full_report: str = Field(
#         description=(
#             "A single cohesive memo written as full paragraphs (no bullets/numbering). "
#             "Merge and reorder the provided paragraphs into themed sections with smooth transitions. "
#             "Preserve any question citations and percentages exactly as given. "
#             "Length: roughly similar to the combined input paragraphs."
#         )
#     )


memo_agent = Agent(
    model,
    deps_type=MemoDependencies,
    retries=3,
    model_settings=BedrockModelSettings(
        temperature=0.3,
        bedrock_additional_model_requests_fields={
            "reasoning_effort": "high"
        }
    ),
)


@memo_agent.system_prompt
async def append_data_to_prompt(ctx: RunContext[MemoDependencies]) -> str:
    append_string = ctx.deps.default_prompt
    if ctx.deps.memo_focus:
        append_string += f"\nThe client has provided the following focus for the memo: {ctx.deps.memo_focus}\n"
    append_string += "\nYour finished report should be about the same length as the initial report.\n"
    return append_string
