"""ChessMate Cognitive Service - Custom Exceptions

This module defines a hierarchy of custom exceptions for the application.
Using specific exceptions makes error handling more precise and the
codebase easier to debug and maintain.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""

class ChessMateException(Exception):
    """Base exception for all application-specific errors."""
    pass

class FENTranslationError(ChessMateException):
    """Raised when a FEN string cannot be translated into query terms."""
    pass

class RAGRetrievalError(ChessMateException):
    """Raised when the RAG tool fails to retrieve knowledge."""
    pass

class DatabaseConnectionError(ChessMateException):
    """Raised when a connection to the database cannot be established."""
    pass

class ConfigurationError(ChessMateException):
    """Raised for missing or invalid configuration."""
    pass
