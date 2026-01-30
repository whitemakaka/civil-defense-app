"""
Bundle loader for offline hybrid search.
No logging, no network, no disk writes for queries.
"""
import json
from pathlib import Path
from typing import Union
import numpy as np

from .types import HybridIndex, RecordMeta, Manifest


def load_bundle(bundle_path: Union[str, Path]) -> HybridIndex:
    """
    Load hybrid search index from bundle directory.
    
    Expected files:
    - manifest.json
    - records_meta.jsonl (or .json)
    - embeddings.npy
    - keyword_index.json
    
    Raises ValueError on validation errors.
    """
    path = Path(bundle_path)
    
    # Load manifest
    manifest_path = path / 'manifest.json'
    if not manifest_path.exists():
        raise ValueError(f"Missing manifest.json in {path}")
    
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest: Manifest = json.load(f)
    
    count = manifest['count']
    dim = manifest['dim']
    
    # Load records
    records_file = path / manifest['records_file']
    records = _load_records(records_file)
    
    if len(records) != count:
        raise ValueError(
            f"Record count mismatch: manifest says {count}, got {len(records)}"
        )
    
    # Load embeddings
    embeddings_file = path / manifest['embeddings_file']
    embeddings = np.load(embeddings_file)
    
    if embeddings.shape[0] != count:
        raise ValueError(
            f"Embedding count mismatch: manifest says {count}, got {embeddings.shape[0]}"
        )
    
    if embeddings.shape[1] != dim:
        raise ValueError(
            f"Embedding dim mismatch: manifest says {dim}, got {embeddings.shape[1]}"
        )
    
    # Convert to float32 if needed (for faster dot products)
    if embeddings.dtype != np.float32:
        embeddings = embeddings.astype(np.float32)
    
    # Load keyword index
    keyword_index_file = path / manifest['keyword_index_file']
    with open(keyword_index_file, 'r', encoding='utf-8') as f:
        keyword_index = json.load(f)
    
    # Validate embedding_idx references
    max_idx = count - 1
    for record in records:
        idx = record['embedding_idx']
        if idx < 0 or idx > max_idx:
            raise ValueError(
                f"Invalid embedding_idx {idx} in record {record['id']}, max is {max_idx}"
            )
    
    return HybridIndex(
        records=records,
        embeddings=embeddings,
        keyword_index=keyword_index,
        dim=dim,
        count=count,
    )


def _load_records(records_path: Path) -> list:
    """Load records from JSON or JSONL file."""
    with open(records_path, 'r', encoding='utf-8') as f:
        if records_path.suffix == '.jsonl':
            return [json.loads(line) for line in f if line.strip()]
        else:
            return json.load(f)

