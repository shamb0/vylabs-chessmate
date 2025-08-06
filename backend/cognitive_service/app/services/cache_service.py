"""ChessMate Cognitive Service - Cache Service

This module provides a simple in-memory cache with a Time-To-Live (TTL)
to reduce redundant calls to the RAG service for identical queries.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
import time
from typing import Any, Optional


class InMemoryCache:
    """
    A simple in-memory cache with TTL support.
    """
    def __init__(self, ttl: int = 300):
        self.cache: dict[str, dict[str, Any]] = {}
        self.ttl = ttl

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieves an item from the cache if it exists and has not expired.
        """
        if key not in self.cache:
            return None

        entry = self.cache[key]
        if time.time() - entry['timestamp'] > self.ttl:
            del self.cache[key]
            return None

        return entry['value']

    def set(self, key: str, value: Any):
        """
        Adds an item to the cache with the current timestamp.
        """
        self.cache[key] = {
            'value': value,
            'timestamp': time.time()
        }

cache_service = InMemoryCache()
