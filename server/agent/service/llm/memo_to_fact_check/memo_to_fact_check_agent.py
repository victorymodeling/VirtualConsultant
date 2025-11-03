from pydantic_ai.usage import RunUsage
from pydantic_ai.exceptions import UnexpectedModelBehavior
from botocore.exceptions import ClientError
from spacy.lang.en import English
from dataclasses import dataclass, asdict
import json
from logging import getLogger
from typing import Optional

from service.data.datasource import ReportingSurveyDataSource
from service.docs.memo_creator import MemoCreator

from .is_fact_checkable_agent import is_fact_checkable_agent, FactCheckOutput
from .fact_check_agent import fact_check_agent, FactCheckDependencies, FactCheckOutput

from ..interfaces import ProgressCallback

logger = getLogger(__name__)

@dataclass
class FactResult:
    claim: str
    supporting_questions: list[str]
    is_factual: bool
    correction: Optional[str] = None

    def to_json(self):
        return json.dumps(asdict(self))


class MemoToFactCheckAgent:
    def __init__(
            self,
            kbid: str,
            key_number: int,
            memo_doc_id: str,
            progress_callback: ProgressCallback = None,
    ):
        self.datasource = ReportingSurveyDataSource(kbid=kbid, key_number=key_number)
        self.memo_creator = MemoCreator(memo_doc_id)
        self.usage = RunUsage()
        self.progress_callback = progress_callback


    def _get_memo_sentences(self) -> list[str]:
        nlp = English()
        nlp.add_pipe('sentencizer')
        all_text = self.memo_creator.read_all_text()
        doc = nlp(all_text)
        sentences = [sent.text.strip() for sent in doc.sents]
        return sentences


    async def _get_fact_check(self, sentence):
        fact_check_deps = FactCheckDependencies(
            datasource=self.datasource,
        )
        result: FactCheckOutput | None = await self._run_agent(sentence, fact_check_agent, fact_check_deps)
        if not result:
            logger.info(f"Failed to fact check {sentence}")
        return FactResult(
            claim=sentence,
            supporting_questions=result.supporting_questions if result else [],
            is_factual=result.is_factual if result else False,
            correction=result.correction if result else "Agent was unable to perform the fact check",
        )

    async def _is_fact_checkable(self, sentence: str) -> bool:
        result: FactCheckOutput = await self._run_agent(sentence, is_fact_checkable_agent, None)
        if result is None:
            return False
        return result.is_fact_checkable


    async def fact_check_memo(self) -> list[FactResult]:
        sentences = self._get_memo_sentences()
        if self.progress_callback:
            self.progress_callback.reset_progress_total(len(sentences) + 1)

        fact_check_results = []
        for sentence in sentences:
            if await self._is_fact_checkable(sentence):
                fact_check_results.append(await self._get_fact_check(sentence))

            self.progress_callback.increment_progress()
        return fact_check_results

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
