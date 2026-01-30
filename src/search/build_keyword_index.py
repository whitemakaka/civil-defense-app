#!/usr/bin/env python3
"""
Build keyword index from records file.
Offline script - run once to generate keyword_index.json.

Usage:
    python build_keyword_index.py <records_file> <output_file>
    python build_keyword_index.py records_meta.jsonl keyword_index.json
"""
import json
import sys
from pathlib import Path
from collections import defaultdict

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.search.offline_hybrid.text import fold, tokenize


def build_keyword_index(records_path: str, output_path: str, min_token_length: int = 3):
    """
    Build inverted keyword index from records.
    
    Args:
        records_path: Path to records_meta.jsonl or .json
        output_path: Output path for keyword_index.json
        min_token_length: Minimum token length to include
    """
    records_path = Path(records_path)
    output_path = Path(output_path)
    
    # Load records
    with open(records_path, 'r', encoding='utf-8') as f:
        if records_path.suffix == '.jsonl':
            records = [json.loads(line) for line in f if line.strip()]
        else:
            records = json.load(f)
    
    # Build index
    index = defaultdict(set)
    
    for record in records:
        embedding_idx = record['embedding_idx']
        
        # Use pre-folded keywords if available
        keywords_folded = record.get('keywords_folded', [])
        
        if not keywords_folded:
            # Fallback: fold keywords ourselves
            keywords = record.get('keywords', [])
            keywords_folded = [fold(kw) for kw in keywords]
        
        for kw in keywords_folded:
            # Tokenize each keyword (might be multi-word)
            tokens = tokenize(kw, min_token_length)
            for token in tokens:
                index[token].add(embedding_idx)
    
    # Convert sets to sorted lists
    index_json = {
        token: sorted(list(indices))
        for token, indices in sorted(index.items())
    }
    
    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(index_json, f, ensure_ascii=False, indent=2)
    
    print(f"Built keyword index: {len(index_json)} tokens from {len(records)} records")
    print(f"Output: {output_path}")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python build_keyword_index.py <records_file> <output_file>")
        print("Example: python build_keyword_index.py records_meta.jsonl keyword_index.json")
        sys.exit(1)
    
    build_keyword_index(sys.argv[1], sys.argv[2])

