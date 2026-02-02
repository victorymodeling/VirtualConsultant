from pydantic_ai.usage import RunUsage
from pydantic_ai.exceptions import UnexpectedModelBehavior
from botocore.exceptions import ClientError

from service.data.datasource import ReportingSurveyDataSource
from service.docs.memo_creator import MemoCreator

from .text_block_agent import text_block_agent, TextBlockDependencies, TextOutput
from .memo_agent import memo_agent, MemoDependencies
from ..interfaces import ProgressCallback

MEMO_AGENT_DEFAULT_PROMPT = (
    "You're a political analyst finalizing a memo from the work of your assistant. "
    "It will include statistics citing numbers, the relevant ones should be used exactly, keeping the citations and stats as is. "
    "What you need to do is write a coherent memo that tells a story about the survey results we're analyzing. "
    "The memo should be almost a call to action, letting the client know what they should do about the results. "
    "We want to keep the writing formal and professional but keep it to the level of an advanced high school writer. "
    "Keep your ideas easy to understand but make sure your points are well made. "
    "Your assistant will provide the list of paragraphs in no particular order, feel free to organize, merge, reduce, or expand them as you think is best. "
    "Your writing should be organized in full paragraphs and not bullet points or heavy markdown. "
    "We want the report to tell a coherent narrative broken out into sections by theme. "
    "The writing should be in proper full paragraphs, no outline structure, numbering, or hypen-or-bullet-point separation. "
    "We want a full write up with coherent ideas and not short one sentence analyses. "
    "Try to focus more on the crosstab analysis than the topline since it provides a deeper depth of understanding differences in groups. "
    "Simple topline breakouts are helpful to highlight but not the kind of deep narrative that provides value. "
)

TEXT_BLOCK_AGENT_DEFAULT_PROMPT = (
    "You're a consultant finalizing a report from your outline. "
    "Your goal is to help your client with the process of writing a memo. "
    "I want you to take the insight that you wrote and add in the relevant numerical data from the survey "
    "that this report is based on. We have crosstab and topline data available to highlight key differences as needed. "
    "The finished text should be three to five sentences in length. Speak precisely and avoid the use of pronouns or first person language. "
    "If your paragraph references percentages please add them in exactly. This will be for the final version of this report. "
    "The aim is to provide a specific and meaningful interpretation of the survey data in a way that wouldn't be obvious to the average person. "
    "For each statistic added to the report please reference the question short names the data came from for easy cross referencing. "
    "We want to keep an emphasis on crosstab data where possible since the simpler topline values don't bring as much value to the client. "
    "When an insight focuses on the intersection of two questions please make sure to pull that focus through to the text. "
)


class InsightsToMemoAgent:
    def __init__(
            self,
            kbid: str,
            key_number: int,
            memo_doc_id: str,
            progress_callback: ProgressCallback = None,
            text_block_agent_prompt: str = None,
            memo_agent_prompt: str = None,
            project_context: str = None
    ):
        self.datasource = ReportingSurveyDataSource(kbid=kbid, key_number=key_number)
        self.memo_creator = MemoCreator(memo_doc_id)
        self.usage = RunUsage()
        self.progress_callback = progress_callback
        self.text_block_agent_prompt = self._add_context(text_block_agent_prompt if text_block_agent_prompt else TEXT_BLOCK_AGENT_DEFAULT_PROMPT, project_context)
        self.memo_agent_prompt = self._add_context(memo_agent_prompt if memo_agent_prompt else MEMO_AGENT_DEFAULT_PROMPT, project_context)

    def _add_context(self, prompt, context):
        if context:
            return prompt + f"\n\nHere is some additional context for the project:\n{context}"
        return prompt


    # TODO place requested usage limits here
    async def create_memo_from_insights(self, insights, focus: str = None):
        if self.progress_callback:
            self.progress_callback.reset_progress_total(len(insights) + 1)
        self.progress_callback.increment_progress()
        text_block_outputs: list[str] = []
        for insight in insights:
            text_block_deps = TextBlockDependencies(
                insight=insight,
                datasource=self.datasource,
                default_prompt=self.text_block_agent_prompt,
            )
            response: TextOutput | None = await self._run_agent("Try to keep the writing simple and actionable.", text_block_agent, text_block_deps)
            if self.progress_callback:
                self.progress_callback.increment_progress()
            if response is None:
                continue
            text_block_outputs.append(response.descriptive_text)

        report_blocks_text = '\n\n'.join(text_block_outputs)
        report_text = await self._merge_report_blocks(report_blocks_text, focus)
        if self.progress_callback:
            self.progress_callback.increment_progress()
        self.memo_creator.append_text(report_text)


    async def _merge_report_blocks(self, report_blocks_text, focus):
        memo_deps = MemoDependencies(
            memo_focus=focus,
            default_prompt=self.memo_agent_prompt,
        )
        response: str | None = await self._run_agent(report_blocks_text, memo_agent,  memo_deps)
        if not response:
            return "AI Agent failed to finalize the memo, here is the first draft:\n\n" + report_blocks_text
        return response


    # TODO flag usage limits here
    async def _run_agent(self, prompt, agent, deps, retries=3):
        self.usage.requests = 0
        attempts = 0
        while True:
            try:
                result = await agent.run(
                    prompt,
                    deps=deps,
                    usage=self.usage
                )
                return result.output
            except (UnexpectedModelBehavior, ClientError) as e:
                attempts += 1
                if attempts >= retries:
                    return None
