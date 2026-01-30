#!/usr/bin/env python3
"""
Demo CLI for offline hybrid search.
Interactive query loop with stub query vector.

Usage:
    python demo_offline_hybrid.py <bundle_path>
    python demo_offline_hybrid.py ../samples/offline_bundle
"""
import sys
from pathlib import Path
import numpy as np

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.search.offline_hybrid import load_bundle, search


def main():
    if len(sys.argv) < 2:
        print("Usage: python demo_offline_hybrid.py <bundle_path>")
        print("Example: python demo_offline_hybrid.py ../samples/offline_bundle")
        sys.exit(1)
    
    bundle_path = sys.argv[1]
    
    # Load index
    print(f"Loading bundle from: {bundle_path}")
    try:
        index = load_bundle(bundle_path)
    except Exception as e:
        print(f"Error loading bundle: {e}")
        sys.exit(1)
    
    print(f"Loaded {index.count} records, dim={index.dim}")
    print(f"Keyword index has {len(index.keyword_index)} tokens")
    print()
    print("Enter queries (empty to quit):")
    print("-" * 40)
    
    while True:
        try:
            query = input("\nQuery: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break
        
        if not query:
            print("Bye!")
            break
        
        # TODO: Replace stub with real query embedding from local model
        # For now, use random normalized vector for demo
        rng = np.random.default_rng(hash(query) % (2**32))
        q_vec = rng.standard_normal(index.dim).astype(np.float32)
        q_vec /= np.linalg.norm(q_vec)
        
        # Search
        results = search(
            index,
            query,
            q_vec,
            top_k=5,
            alpha=0.85,
            beta=0.15,
        )
        
        if not results:
            print("No results found.")
            continue
        
        print(f"\nFound {len(results)} results:")
        for i, r in enumerate(results, 1):
            print(f"\n{i}. [{r.lang}] {r.title}")
            print(f"   Score: {r.score:.3f} (kw={r.keyword_score:.2f}, vec={r.vector_score:.2f})")
            print(f"   Source: {r.doc_title}, p.{r.page}")
            # Truncate content for display
            content = r.content[:150] + "..." if len(r.content) > 150 else r.content
            print(f"   {content}")


if __name__ == '__main__':
    main()

