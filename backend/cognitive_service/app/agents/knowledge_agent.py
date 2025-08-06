"""ChessMate Cognitive Service - Knowledge Agent

This agent is responsible for interfacing with the chess knowledge base.
It uses the ChessKnowledgeRetrieverTool to find information relevant
to the current game state.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.adk.tools import BaseTool
from google.genai.types import ThinkingConfig


class KnowledgeAgent(LlmAgent):
    """
    An agent specialized in retrieving chess knowledge.
    It is a container for the ChessKnowledgeRetrieverTool.
    The orchestration logic is handled by the RootAgent's prompt.
    """

    def __init__(
        self, model, rag_tool: BaseTool, instruction: str, **kwargs
    ):
        super().__init__(
            model=model,
            planner=BuiltInPlanner(
                thinking_config=ThinkingConfig(include_thoughts=True)
            ),
            tools=[rag_tool],
            description="Retrieves deep, contextual chess knowledge for a given board position (FEN).",
            instruction=instruction,
            **kwargs
        )

