"""Unit tests for the AgentWorkflowPromptFactory.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

import unittest
import os
from unittest.mock import patch, mock_open

from app.tools.agent_workflow_prompt_factory import AgentWorkflowPromptFactory

class TestAgentWorkflowPromptFactory(unittest.TestCase):
    """
    Tests the prompt generation logic.
    """

    def test_knowledge_agent_prompt_creation(self):
        """
        Tests that the factory correctly loads a template and injects context.
        """
        # Arrange
        template_content = "FEN is {fen} and stages are {stages}"
        mock_file = mock_open(read_data=template_content)
        
        factory = AgentWorkflowPromptFactory(template_dir="dummy/path")
        context = {"fen": "rnbqkbnr...", "stages": "['novice']"}
        
        # Act
        with patch("builtins.open", mock_file):
            prompt = factory.create_prompt("knowledge_agent", context)
            
        # Assert
        self.assertIn("FEN is rnbqkbnr...", prompt)
        self.assertIn("stages are ['novice']", prompt)
        mock_file.assert_called_once_with("dummy/path/knowledge_agent.md", "r")

    def test_file_not_found(self):
        """
        Tests that a FileNotFoundError is raised for a non-existent template.
        """
        # Arrange
        factory = AgentWorkflowPromptFactory(template_dir="non_existent_dir")
        
        # Act & Assert
        with self.assertRaises(FileNotFoundError):
            factory.create_prompt("non_existent_agent", {})

if __name__ == "__main__":
    unittest.main()
