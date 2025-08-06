"""ChessMate Cognitive Service - Root Agent

This is the primary orchestrator agent for the ChessMate cognitive service.
It coordinates the workflow between specialized sub-agents.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent
from google.adk.models.base_llm import BaseLlm

from app.agents.knowledge_agent import KnowledgeAgent
from app.agents.game_state_agent import GameStateAgent
from app.agents.coaching_agent import CoachingAgent
from app.tools.agent_workflow_prompt_factory import AgentWorkflowPromptFactory
from app.tools.rag_tool import ChessKnowledgeRetrieverTool


def create_root_agent(model: BaseLlm) -> SequentialAgent:
    """
    Factory function to create and configure the RootAgent for legal moves.
    """
    prompt_factory = AgentWorkflowPromptFactory()
    rag_tool = ChessKnowledgeRetrieverTool()

    game_state_instruction = prompt_factory.create_prompt(
        "game_state_agent", context_keys=["fen"]
    )
    knowledge_agent_instruction = prompt_factory.create_prompt(
        "knowledge_agent", context_keys=["fen"]
    )
    coaching_instruction = prompt_factory.create_prompt(
        "coaching_agent",
        context_keys=["game_state_analysis", "retrieved_knowledge"],
    )

    game_state_agent = GameStateAgent(
        name="game_state_agent",
        model=model,
        instruction=game_state_instruction,
        output_key="game_state_analysis",
    )
    knowledge_agent = KnowledgeAgent(
        name="knowledge_agent",
        model=model,
        rag_tool=rag_tool,
        instruction=knowledge_agent_instruction,
        output_key="retrieved_knowledge",
    )
    coaching_agent = CoachingAgent(
        name="coaching_agent", model=model, instruction=coaching_instruction
    )

    return SequentialAgent(
        name="root_agent",
        sub_agents=[
            ParallelAgent(
                name="analysis_phase",
                sub_agents=[game_state_agent, knowledge_agent],
            ),
            coaching_agent,
        ],
    )

def create_illegal_move_root_agent(model: BaseLlm) -> SequentialAgent:
    """
    Factory function for a lightweight sequential agent to handle illegal moves.
    """
    prompt_factory = AgentWorkflowPromptFactory()
    illegal_move_instruction = prompt_factory.create_prompt(
        "illegal_move_agent",
        context_keys=["attempted_move", "current_fen", "legal_moves"],
    )
    illegal_move_agent = LlmAgent(
        name="illegal_move_agent",
        model=model,
        instruction=illegal_move_instruction,
    )
    return SequentialAgent(
        name="illegal_move_root_agent", sub_agents=[illegal_move_agent]
    )