from logging import getLogger

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.bedrock import BedrockModelSettings

from ..base import model


logger = getLogger(__name__)



class FactCheckOutput(BaseModel):
    is_fact_checkable: bool = Field(description="True if can be fact checked, False if purely opinion or interpretation")


is_fact_checkable_agent = Agent(
    model,
    output_type=FactCheckOutput,
    model_settings=BedrockModelSettings(
        temperature=0.2
    ),
    system_prompt=(
        """You're involved in the fact checking process of a written report. We're just getting started with it. 
        The first step is you'll be given a sentence, and you simply need to identify it as being fact checkable or not.
        Anything containing hard stats or numerical claims will be fact checked from the results of a recent survey.
        Some things are analysis, opinion, or suggested planning. These are sentences about the hard facts but not hard facts. 
        Those don't need to be fact checked since they're up to interpretation. An example of a fact checkable statement would be:
        'Since 47% of women are against the bill while only 12% of men are, we should have more targeted outreach to women.'
        While a similar statement without hard supporting facts would not be fact checkable:
        'We should shore up our outreach to women since they are less supportive of the bill.'
        If you don't see specific claims of numerical support, it is not fact checkable.
        """
    )
)
