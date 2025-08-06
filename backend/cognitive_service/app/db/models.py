"""ChessMate Cognitive Service - Database Models

This file defines the SQLAlchemy models for the ChessMate RAG database.
These models provide a structured way to interact with the chess knowledge
base stored in PostgresML.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass

class ChessKnowledge(Base):
    """
    Represents a single piece of chess knowledge in the database.
    This could be a concept, a game annotation, or a strategic principle.
    """
    __tablename__ = 'chess_knowledge'

    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    context_type = Column(String(50))  # e.g., 'opening', 'middlegame', 'endgame'
    fen = Column(String(255))  # FEN string for the position, if applicable

    def __repr__(self):
        return f"<ChessKnowledge(id={self.id}, type='{self.context_type}', fen='{self.fen}')>"
