"""ChessMate Cognitive Service - Game State Agent

This agent is responsible for interpreting the game state (FEN)
and extracting key information for other agents to use.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

from google.adk.agents import LlmAgent

class GameStateAgent(LlmAgent):
    """
    Analyzes the FEN string to understand the current state of the game.
    """
    def __init__(self, model, instruction, **kwargs):
        super().__init__(model=model, instruction=instruction, **kwargs)
