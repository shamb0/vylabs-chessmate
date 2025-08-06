"""ChessMate Cognitive Service - RAG Tool

This module defines the tool responsible for retrieving chess knowledge.
It acts as a client to the genai-toolbox service.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
import json
from typing import Any, List, Literal, Optional

from google.adk.tools import _automatic_function_calling_util, BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai import types as genai_types
from pydantic import BaseModel, Field
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from toolbox_core import ToolboxClient

from app.config import settings
from app.core.exceptions import RAGRetrievalError
from app.services.cache_service import cache_service
from app.tools.fen_query_factory import FENQueryFactory

log = structlog.get_logger()

# Define the allowed cognitive stages to constrain the LLM's input.
CognitiveStage = Literal["novice", "developing", "expert"]

class RagToolInput(BaseModel):
    fen: str = Field(description="The FEN string of the current board state.")
    cognitive_stage: CognitiveStage = Field(
        description="The cognitive stage to filter the knowledge by. Must be one of 'novice', 'developing', or 'expert'."
    )


class ChessKnowledgeRetrieverTool(BaseTool):
    """
    A tool to retrieve chess knowledge by calling the genai-toolbox service.
    It uses a FENQueryFactory to generate a natural language query for RAG.
    """

    def __init__(self):
        super().__init__(
            name="rag_tool",
            description="Retrieves chess knowledge from the RAG service based on a FEN string and cognitive stage.",
        )
        self.fen_query_factory = FENQueryFactory()

    def _get_declaration(self) -> Optional[genai_types.FunctionDeclaration]:
        """Gets the OpenAPI specification of this tool."""
        declaration = (
            _automatic_function_calling_util.build_function_declaration(
                func=RagToolInput
            )
        )
        declaration.name = self.name
        declaration.description = self.description
        return declaration

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def run_async(
        self,
        args: dict[str, Any],
        tool_context: Optional[ToolContext] = None,
    ) -> List[dict[str, Any]]:
        """
        Generates a query from FEN, then retrieves knowledge from the RAG service, with caching.
        """
        try:
            validated_args = RagToolInput.model_validate(args)
            log.info("RAG_TOOL_VALIDATED_ARGS", args=validated_args.model_dump())
        except Exception as e:
            log.error("RAG_TOOL_VALIDATION_FAILED", raw_args=args, error=str(e))
            # If validation fails, we can't proceed. Fallback if enabled.
            if settings.enable_fallbacks:
                log.warn("RAG_FALLBACK_TRIGGERED", reason="Input validation failed.")
                return self._get_static_fallback()
            raise RAGRetrievalError("Input validation failed for RAG tool.", "VALIDATION_ERROR") from e

        async with self.fen_query_factory as factory:
            query_terms = await factory.generate_query(validated_args.fen)
            
        cache_key = f"{query_terms}:{validated_args.cognitive_stage}"
        if settings.enable_caching:
            cached_result = cache_service.get(cache_key)
            if cached_result:
                log.info("RAG_CACHE_HIT", query=query_terms)
                if isinstance(cached_result, list):
                    return cached_result
                else:
                    log.warn("INVALID_CACHE_DATA_SKIPPED", key=cache_key, value=cached_result)

        result: List[dict[str, Any]] = []
        try:
            result = await self._make_toolbox_request(
                query_terms, [validated_args.cognitive_stage] # Pass as a list
            )
            if settings.enable_caching:
                cache_service.set(cache_key, result)
                log.info("RAG_CACHE_SET", query=query_terms)
            return result

        except RAGRetrievalError as e:
            log.error("RAG_RETRIEVAL_FAILED", reason=str(e))
            if settings.enable_fallbacks:
                log.warn("RAG_FALLBACK_TRIGGERED", reason="Toolbox request failed.")
                return self._get_static_fallback()
            else:
                raise

    async def _make_toolbox_request(
        self, query_terms: str, cognitive_stages: List[str]
    ) -> List[dict[str, Any]]:
        try:
            async with ToolboxClient(settings.mcp_toolbox_url) as client:
                rag_tool = await client.load_tool("search_chess_knowledge")
                params = {
                    "query_terms": query_terms,
                    "cognitive_stages": ",".join(cognitive_stages),
                }
                log.info("TOOLBOX_REQUEST_PARAMS", params=params)
                result = await rag_tool(**params)
                log.info("TOOLBOX_RESPONSE", response=result)
                return result
        except Exception as e:
            log.error(
                "TOOLBOX_REQUEST_EXCEPTION",
                exc_info=True,
                reason=str(e)
            )
            raise RAGRetrievalError(
                f"Toolbox request failed: {e}", "TOOLBOX_ERROR"
            ) from e

    def _get_static_fallback(self) -> List[dict[str, Any]]:
        """
        Provides a static, hardcoded response as a fallback.
        """
        return [
            {
                "content": "When in the opening, focus on controlling the center of the board. This is a key principle of good chess strategy.",
                "context_type": "opening",
                "fen": None,
                "distance": 0.99,
            }
        ]
