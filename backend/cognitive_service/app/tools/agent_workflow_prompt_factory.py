"""ChessMate Cognitive Service - Agent Workflow Prompt Factory

This module provides a centralized factory for generating dynamic,
context-aware prompts for the various agents in the system.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

import os
from typing import Dict, Any, List

class AgentWorkflowPromptFactory:
    """
    A factory to create agent prompts from templates.
    """
    def __init__(self, template_dir: str = "app/prompts"):
        self.template_dir = template_dir

    def create_prompt(
        self, agent_name: str, context: Dict[str, Any] = None, context_keys: List[str] = None
    ) -> str:
        """
        Generates a prompt for a given agent by loading its template
        and injecting the provided context.

        Args:
            agent_name: The name of the agent (e.g., 'knowledge_agent').
            context: A dictionary of values to format the prompt with.
            context_keys: A list of keys to extract from the context.

        Returns:
            The formatted prompt string.
        
        Raises:
            FileNotFoundError: If the prompt template for the agent does not exist.
        """
        template_path = os.path.join(self.template_dir, f"{agent_name}.md")
        
        with open(template_path, "r") as f:
            template = f.read()

        if context:
            return template.format(**context)
        elif context_keys:
            # Create a dictionary of placeholders for the ADK to fill
            placeholders = {key: f"{{{key}}}" for key in context_keys}
            return template.format(**placeholders)
        else:
            return template
