"""Unit tests for the FEN Translator."""
from src.core.fen_translator import MVPFENQueryFactory


def test_fen_translator_starting_position():
    """
    Tests the FEN translator with the standard chess starting position.
    """
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    factory = MVPFENQueryFactory(fen)
    terms = factory.generate_query_terms()
    expected_terms = "black_bishop black_king black_knight black_queen black_rook white_bishop white_king white_knight white_queen white_rook opening white_kingside_castle white_queenside_castle black_kingside_castle black_queenside_castle"
    assert set(terms.split()) == set(expected_terms.split())

def test_fen_translator_middlegame():
    """
    Tests the FEN translator in a typical middlegame scenario.
    """
    fen = "r1bqkbnr/pp1ppppp/n7/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
    factory = MVPFENQueryFactory(fen)
    terms = factory.generate_query_terms()
    assert "middlegame" not in terms
    assert "opening" in terms

def test_fen_translator_endgame():
    """
    Tests the FEN translator in an endgame scenario.
    """
    fen = "8/8/8/8/8/4k3/8/R3K3 w Q - 5 50"
    factory = MVPFENQueryFactory(fen)
    terms = factory.generate_query_terms()
    assert "endgame" in terms
    assert "white_rook" in terms
    assert "black_king" in terms
    assert "white_queenside_castle" in terms
