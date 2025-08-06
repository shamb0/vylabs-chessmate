"""ChessMate Cognitive Service - FEN Translator

This module translates a FEN (Forsyth-Edwards Notation) string into a
set of searchable query terms for the RAG tool. This is a critical
step in bridging the gap between the raw game state and the knowledge base.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
import chess


class MVPFENQueryFactory:
    """
    A simple, rule-based FEN query factory for the MVP.
    It extracts basic, high-value features from a FEN string.
    """

    def __init__(self, fen: str):
        self.board = chess.Board(fen)

    def generate_query_terms(self) -> str:
        """
        Generates a space-separated string of query terms.
        """
        terms = []
        terms.extend(self._get_phase())
        terms.extend(self._get_active_pieces())
        terms.extend(self._get_castling_rights())

        # Remove duplicates and join
        return " ".join(sorted(list(set(terms))))

    def _get_phase(self) -> list[str]:
        """Determines the game phase."""
        if self.board.fullmove_number < 10:
            return ["opening"]
        elif self.board.fullmove_number < 30:
            return ["middlegame"]
        else:
            return ["endgame"]

    def _get_active_pieces(self) -> list[str]:
        """Identifies major and minor pieces on the board."""
        pieces = []
        for piece_type in [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT]:
            if self.board.pieces(piece_type, chess.WHITE):
                pieces.append(f"white_{chess.piece_name(piece_type)}")
            if self.board.pieces(piece_type, chess.BLACK):
                pieces.append(f"black_{chess.piece_name(piece_type)}")
        return pieces

    def _get_castling_rights(self) -> list[str]:
        """Checks for castling availability."""
        rights = []
        if self.board.has_kingside_castling_rights(chess.WHITE):
            rights.append("white_kingside_castle")
        if self.board.has_queenside_castling_rights(chess.WHITE):
            rights.append("white_queenside_castle")
        if self.board.has_kingside_castling_rights(chess.BLACK):
            rights.append("black_kingside_castle")
        if self.board.has_queenside_castling_rights(chess.BLACK):
            rights.append("black_queenside_castle")
        return rights
