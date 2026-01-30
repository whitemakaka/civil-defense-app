"""
Offline Hybrid Search module.
Combines keyword matching with vector similarity for fast mobile search.

No logging, no network, no disk writes for queries.
"""
from .types import HybridIndex, RecordMeta, Manifest, SearchResult
from .text import fold, tokenize, normalize_query
from .load import load_bundle
from .search import search

__all__ = [
    'HybridIndex',
    'RecordMeta',
    'Manifest',
    'SearchResult',
    'fold',
    'tokenize',
    'normalize_query',
    'load_bundle',
    'search',
]

