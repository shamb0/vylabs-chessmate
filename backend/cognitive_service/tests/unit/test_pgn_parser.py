"""Unit tests for the PGN Parser."""
from src.core.pgn_parser import PGNParser

SAMPLE_PGN = """
[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This is the Ruy Lopez.} 4. Ba4 Nf6 5. O-O Be7 1/2-1/2
"""

def test_pgn_parser_headers():
    """
    Tests that the PGN parser correctly extracts game headers.
    """
    parser = PGNParser(SAMPLE_PGN)
    games = parser.parse_games()
    assert len(games) == 1
    assert games[0]["headers"]["White"] == "Fischer, Robert J."
    assert games[0]["headers"]["Black"] == "Spassky, Boris V."

def test_pgn_parser_moves_and_comments():
    """
    Tests that the PGN parser correctly extracts moves, FENs, and comments.
    """
    parser = PGNParser(SAMPLE_PGN)
    games = parser.parse_games()
    moves = games[0]["moves"]
    assert len(moves) == 10
    assert moves[0]["san"] == "e4"
    assert moves[1]["fen"] == "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    assert moves[4]["comment"] == "This is the Ruy Lopez."
