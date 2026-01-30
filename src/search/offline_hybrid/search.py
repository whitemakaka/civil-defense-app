"""
Hybrid search implementation.
No logging, no network, no disk writes.
"""
from typing import List, Optional
import numpy as np

from .types import HybridIndex, SearchResult
from .text import normalize_query


def search(
    index: HybridIndex,
    query: str,
    q_vec: np.ndarray,
    *,
    lang: Optional[str] = None,
    top_k: int = 10,
    alpha: float = 0.85,
    beta: float = 0.15,
    max_candidates: int = 300,
) -> List[SearchResult]:
    """
    Perform hybrid search combining keyword and vector similarity.
    
    Args:
        index: Loaded HybridIndex
        query: User query string
        q_vec: Query embedding vector (1D, L2-normalized)
        lang: Optional language filter ('pl' or 'en')
        top_k: Number of results to return
        alpha: Weight for vector similarity (default 0.85)
        beta: Weight for keyword score (default 0.15)
        max_candidates: Max candidates from keyword stage
    
    Returns:
        List of SearchResult sorted by score descending
    """
    # Empty query -> return empty
    if not query.strip():
        return []
    
    # Stage 1: Keyword candidate selection
    query_tokens = normalize_query(query, min_token_length=3)
    keyword_scores = _compute_keyword_scores(index, query_tokens)
    
    # Get candidate set
    candidates = _select_candidates(
        keyword_scores, max_candidates, index.records, lang
    )
    
    if not candidates:
        # No keyword matches -> full vector search fallback
        return _full_vector_search(index, q_vec, lang, top_k)
    
    # Stage 2: Vector scoring on candidates
    vector_scores = _compute_vector_scores(index, candidates, q_vec)
    
    # Stage 3: Hybrid ranking
    results = _combine_scores(
        index.records, candidates, keyword_scores, vector_scores, alpha, beta
    )
    
    # Sort and return top_k
    results.sort(key=lambda r: r.score, reverse=True)
    return results[:top_k]


def _compute_keyword_scores(
    index: HybridIndex, query_tokens: List[str]
) -> dict:
    """Compute keyword scores using inverted index."""
    scores = {}
    
    for token in query_tokens:
        matching_indices = index.keyword_index.get(token, [])
        for idx in matching_indices:
            scores[idx] = scores.get(idx, 0) + 1
    
    return scores


def _select_candidates(
    keyword_scores: dict,
    max_candidates: int,
    records: list,
    lang: Optional[str],
) -> List[int]:
    """Select top candidates from keyword scores."""
    entries = list(keyword_scores.items())
    
    # Filter by language if specified
    if lang:
        entries = [(idx, score) for idx, score in entries 
                   if records[idx].get('lang') == lang]
    
    # Sort by score descending
    entries.sort(key=lambda x: x[1], reverse=True)
    
    return [idx for idx, _ in entries[:max_candidates]]


def _compute_vector_scores(
    index: HybridIndex, candidates: List[int], q_vec: np.ndarray
) -> dict:
    """
    Compute cosine similarity for candidates.
    Embeddings are L2-normalized, so dot product = cosine.
    """
    scores = {}
    
    # Ensure q_vec is 1D
    q_vec = q_vec.flatten()
    
    for idx in candidates:
        doc_vec = index.embeddings[idx]
        # Dot product on normalized vectors = cosine similarity
        similarity = float(np.dot(q_vec, doc_vec))
        # Normalize to [0, 1] range (cosine is in [-1, 1])
        scores[idx] = (similarity + 1.0) / 2.0
    
    return scores


def _combine_scores(
    records: list,
    candidates: List[int],
    keyword_scores: dict,
    vector_scores: dict,
    alpha: float,
    beta: float,
) -> List[SearchResult]:
    """Combine keyword and vector scores with weights."""
    # Normalize keyword scores to [0, 1]
    max_kw_score = max(keyword_scores.values()) if keyword_scores else 1
    
    results = []
    for idx in candidates:
        record = records[idx]
        kw_score = keyword_scores.get(idx, 0) / max_kw_score
        vec_score = vector_scores.get(idx, 0)
        final_score = alpha * vec_score + beta * kw_score
        
        results.append(SearchResult(
            id=record['id'],
            score=final_score,
            title=record['title'],
            content=record['content'],
            doc_title=record['doc_title'],
            chapter_title=record.get('chapter_title', ''),
            page=record['page'],
            source=record['source'],
            lang=record['lang'],
            keyword_score=kw_score,
            vector_score=vec_score,
        ))
    
    return results


def _full_vector_search(
    index: HybridIndex,
    q_vec: np.ndarray,
    lang: Optional[str],
    top_k: int,
) -> List[SearchResult]:
    """Fallback: full vector search when no keyword matches."""
    q_vec = q_vec.flatten()
    
    # Compute all similarities at once
    similarities = np.dot(index.embeddings, q_vec)
    
    # Create results
    results = []
    for idx, similarity in enumerate(similarities):
        record = index.records[idx]
        
        # Filter by language
        if lang and record.get('lang') != lang:
            continue
        
        vec_score = (float(similarity) + 1.0) / 2.0
        
        results.append(SearchResult(
            id=record['id'],
            score=vec_score,
            title=record['title'],
            content=record['content'],
            doc_title=record['doc_title'],
            chapter_title=record.get('chapter_title', ''),
            page=record['page'],
            source=record['source'],
            lang=record['lang'],
            keyword_score=0.0,
            vector_score=vec_score,
        ))
    
    results.sort(key=lambda r: r.score, reverse=True)
    return results[:top_k]

