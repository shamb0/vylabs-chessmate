"""ChessMate Cognitive Service - Coaching Agent

This agent provides coaching advice to the user based on the
analyzed game state and retrieved knowledge.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

from google.adk.agents import LlmAgent

class CoachingAgent(LlmAgent):
    """
    Generates coaching messages based on game analysis and knowledge.
    """
    def __init__(self, model, instruction, **kwargs):
        super().__init__(model=model, instruction=instruction, **kwargs)
