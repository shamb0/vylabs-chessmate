"""ChessMate FEN Query Factory

This module defines the FENQueryFactory, a tool for generating high-quality,
natural language queries from a FEN string using the Stockfish chess engine.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

import asyncio
import chess
import chess.engine
from typing import List
import structlog

log = structlog.get_logger()

class FENQueryFactory:
    """
    A factory to generate natural language queries from a FEN string for semantic search.
    """

    def __init__(self, stockfish_path: str = "/usr/games/stockfish"):
        """
        Initializes the factory with the path to the Stockfish engine.
        """
        self.stockfish_path = stockfish_path
        self.engine = None

    async def __aenter__(self):
        """Asynchronously opens the engine."""
        try:
            transport, engine = await chess.engine.popen_uci(self.stockfish_path)
            self.engine = engine
        except FileNotFoundError:
            log.error("FEN_QUERY_FACTORY_STOCKFISH_ERROR", error="Stockfish engine not found", path=self.stockfish_path)
            self.engine = None
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Asynchronously closes the engine."""
        if self.engine:
            await self.engine.quit()

    async def generate_query(self, fen: str) -> str:
        """
        Generates a natural language query for a given FEN string using Stockfish.

        Args:
            fen: The FEN string to analyze.

        Returns:
            A natural language query describing the position and best moves.
        """
        if not self.engine:
            log.warn("FEN_QUERY_FACTORY_NO_ENGINE", msg="Stockfish engine not available, returning basic query.")
            return "General chess principles and openings"
            
        query = ""
        try:
            board = chess.Board(fen)
            
            # Get basic information
            turn = "White" if board.turn == chess.WHITE else "Black"
            move_number = board.fullmove_number
            
            # Analyze the position for the top 3 moves
            info = await self.engine.analyse(board, chess.engine.Limit(time=0.1), multipv=3)
            
            best_moves = []
            for move_info in info:
                if "pv" in move_info and move_info["pv"]:
                    move = move_info["pv"][0]
                    san = board.san(move)
                    best_moves.append(san)
            
            query = f"Chess position analysis for {turn} to move on move {move_number}. Key moves to consider are {', '.join(best_moves)}. Focus on opening theory, middle game strategy, or tactical opportunities related to this board state."

        except chess.engine.EngineTerminatedError as e:
            log.error("FEN_QUERY_FACTORY_STOCKFISH_ERROR", error=str(e), fen=fen)
            return "General chess strategy"
        except Exception as e:
            log.error("FEN_QUERY_FACTORY_UNEXPECTED_ERROR", error=str(e), fen=fen)
            return "General chess principles"
            
        log.info("FEN_QUERY_FACTORY_GENERATED_QUERY", query=query, fen=fen)
        return query