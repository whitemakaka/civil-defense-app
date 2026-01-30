"""
Type definitions for offline hybrid search
"""
from typing import TypedDict, List, Literal

# ============================================================================
# BUNDLE TYPES (on-disk format)
# ============================================================================

class Manifest(TypedDict):
    """
    Manifest for offline bundle - MUST be validated against runtime embedder.
    
    Documents available in PL and EN:
    - badz_gotowy: "Bądź gotowy – poradnik na czas kryzysu i wojny" (PL) / "Get Ready" (EN)
    - poradnik_bezpieczenstwa: "Poradnik bezpieczeństwa" (PL) / "Safety Handbook" (EN)
    """
    # Embedding model info (CRITICAL for compatibility)
    model: str  # e.g. "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    dim: int  # embedding dimension (e.g. 384)
    dtype: Literal['float16', 'float32']  # embedding data type
    
    # Dataset info
    count: int  # number of records
    schema_version: str  # bundle format version (e.g. "v1")
    
    # File references
    records_file: str  # e.g. "records_meta.jsonl"
    embeddings_file: str  # e.g. "embeddings.f16.npy"
    keyword_index_file: str  # e.g. "keyword_index.json" (optional but recommended)


class RecordMeta(TypedDict):
    """
    Single record metadata (one chunk/quote from source documents)
    """
    id: str
    lang: Literal['pl', 'en']
    source: str  # doc_stem without language suffix (badz_gotowy, poradnik_bezpieczenstwa)
    doc_title: str  # Full document title for display (language-specific)
    doc_stem: str  # Same as source - stable document identifier
    chapter_title: str
    page: int
    title: str
    content: str
    keywords: List[str]  # original keywords with diacritics
    keywords_folded: List[str]  # normalized keywords (no diacritics, lowercase)
    embedding_idx: int  # index into embeddings array


# ============================================================================
# RUNTIME TYPES
# ============================================================================

class SearchResult(TypedDict):
    """
    Single search result returned to caller
    """
    id: str
    score: float  # hybrid score (alpha * cosine + beta * keyword_score_norm)
    title: str
    content: str
    doc_title: str
    page: int
    source: str
    lang: Literal['pl', 'en']


class HybridIndex(TypedDict):
    """
    In-memory index structure loaded from bundle
    """
    records: List[RecordMeta]
    embeddings: 'numpy.ndarray'  # N x D float array (L2-normalized)
    keyword_index: dict  # keyword_folded -> List[embedding_idx]
    manifest: Manifest  # keep manifest for validation
