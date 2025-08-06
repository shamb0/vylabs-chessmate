"""Unit tests for the FENQueryFactory.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

import pytest
import chess
import chess.engine
from unittest.mock import AsyncMock, patch
from app.tools.fen_query_factory import FENQueryFactory

@pytest.mark.asyncio
async def test_generate_keywords_success():
    """
    Tests that the factory correctly generates keywords from a FEN string
    by mocking the Stockfish engine.
    """
    # Mock the engine's analysis result
    mock_analysis_result = [
        {"pv": [chess.Move.from_uci("e2e4")]},
        {"pv": [chess.Move.from_uci("d2d4")]},
        {"pv": [chess.Move.from_uci("g1f3")]},
    ]

    # Patch the SimpleEngine.popen_uci method
    with patch("chess.engine.SimpleEngine.popen_uci") as mock_popen:
        # Configure the async context manager
        mock_engine = AsyncMock()
        mock_engine.analyse.return_value = mock_analysis_result
        
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_engine
        mock_popen.return_value = mock_context_manager

        factory = FENQueryFactory()
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        keywords = await factory.generate_keywords(fen)

        # Verify the results
        assert keywords == ["best_move_1:e4", "best_move_2:d4", "best_move_3:Nf3"]
        mock_engine.analyse.assert_called_once()

@pytest.mark.asyncio
async def test_stockfish_not_found():
    """
    Tests that the factory handles a FileNotFoundError gracefully.
    """
    with patch("chess.engine.SimpleEngine.popen_uci", side_effect=FileNotFoundError("stockfish not found")):
        factory = FENQueryFactory()
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        keywords = await factory.generate_keywords(fen)
        assert keywords == ["stockfish_error"]

