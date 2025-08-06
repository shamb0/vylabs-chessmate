"""ChessMate Cognitive Service - PGN Parser

This module is responsible for parsing Portable Game Notation (PGN) files
to extract chess games, moves, and annotations. It will be used by the
data ingestion pipeline to populate the RAG knowledge base.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
import io
import os
from typing import Any, Dict, List, Union

import chess.pgn
import structlog
from tqdm import tqdm

from app.core.metrics import DataQualityMetrics

log = structlog.get_logger()

class PGNParser:
    """
    A streaming PGN parser that extracts key information from chess games,
    with progress tracking and resilience to corrupted data.
    """

    def __init__(self, pgn_file_path: str, quarantine_logger: structlog.stdlib.BoundLogger):
        self.pgn_file_path = pgn_file_path
        self.total_size = os.path.getsize(pgn_file_path)
        self.quarantine_logger = quarantine_logger

    def __iter__(self):
        """Allows the parser to be used as an iterator, yielding games one by one."""
        self.file_handle = open(self.pgn_file_path, 'r', encoding='utf-8', errors='ignore')
        return self

    def __next__(self):
        """Reads and parses the next game from the stream."""
        try:
            game = chess.pgn.read_game(self.file_handle)
            if game is None:
                raise StopIteration
            return game
        except Exception as e:
            log.error("Unhandled error reading game, skipping.", error=str(e))
            # Attempt to recover by finding the next game
            while True:
                line = self.file_handle.readline()
                if not line: # End of file
                    raise StopIteration
                if line.startswith('[Event '):
                    # We found a new game, but we need to "put back" the line.
                    # This is a bit tricky with standard file handles.
                    # A simpler approach for now is to just move on, accepting we might lose this game.
                    # For a more robust solution, a more complex buffered reader would be needed.
                    break
            raise StopIteration # For simplicity, stop on error for now.

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.file_handle:
            self.file_handle.close()

    def parse_stream(self, metrics: DataQualityMetrics, percentage_to_parse: int):
        """
        Parses games from the PGN file up to a specified percentage, yielding
        processed game data one game at a time.
        """
        target_size = self.total_size * (percentage_to_parse / 100)

        with open(self.pgn_file_path, 'r', encoding='utf-8', errors='ignore') as f:
            with tqdm(total=int(target_size), unit='B', unit_scale=True, desc="Parsing PGN") as pbar:
                while f.tell() < target_size:
                    current_pos = f.tell()
                    try:
                        game = chess.pgn.read_game(f)
                        if game is None:
                            pbar.update(int(target_size) - pbar.n)
                            break

                        metrics.games_found += 1
                        moves = self._extract_moves_with_context(game, metrics)

                        if moves is not None:
                            game_data = {
                                "headers": dict(game.headers),
                                "moves": moves
                            }
                            metrics.games_processed += 1
                            yield game_data
                        else:
                            metrics.games_skipped_corruption += 1

                    except Exception as e:
                        log.error("Unhandled error reading game, skipping.", error=str(e), position=current_pos)
                        metrics.games_skipped_unhandled_error += 1
                        # Simple recovery: find the next likely game start
                        while True:
                            line = f.readline()
                            if not line or line.startswith('[Event '):
                                if line:
                                    f.seek(f.tell() - len(line.encode('utf-8', 'ignore')))
                                break
                    
                    pbar.update(f.tell() - pbar.n)


    def _extract_moves_with_context(self, game: chess.pgn.Game, metrics: DataQualityMetrics) -> Union[List[Dict[str, Any]], None]:
        """
        Extracts moves along with their FEN and any comments.
        If an illegal move is found, the entire game is quarantined and this returns None.
        """
        moves_data = []
        board = game.board()
        for node in game.mainline():
            move = node.move
            if move:
                try:
                    # This is the line that can fail for illegal moves
                    san = board.san(move)
                    board.push(move)
                    move_data = {
                        "san": san,
                        "fen": board.fen(),
                        "comment": node.comment
                    }
                    moves_data.append(move_data)
                except (AssertionError, ValueError) as e:
                    self.quarantine_logger.warning(
                        "Illegal move detected; quarantining game.",
                        game_headers=dict(game.headers),
                        move=str(move),
                        fen_before_move=board.fen(),
                        error=str(e)
                    )
                    return None # Signal that the game is corrupted
        return moves_data
