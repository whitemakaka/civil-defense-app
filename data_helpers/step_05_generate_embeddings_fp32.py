"""
Step 05: Generate FP32 embeddings for all records (vector_input).

Input:
- JSONL file with hybrid-search records (one object per line)
  Required fields: id, country, lang, title, content, keywords, vector_input

Output:
- temp_bundle_build/records/records_meta.jsonl   (adds embedding_idx = line index)
- temp_bundle_build/embeddings_fp32/embeddings.f32.npy
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


def _read_jsonl(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception as e:
                raise RuntimeError(f"Invalid JSONL at {path}:{line_no}: {e}")
            if isinstance(obj, dict):
                rows.append(obj)
    return rows


def _build_text(r: Dict[str, Any]) -> str:
    vi = str(r.get("vector_input") or "").strip()
    if vi:
        return vi
    title = str(r.get("title") or "").strip()
    content = str(r.get("content") or "").strip()
    keywords = r.get("keywords") or []
    if isinstance(keywords, list):
        kw = ", ".join(str(k).strip() for k in keywords if str(k).strip())
    else:
        kw = str(keywords).strip()
    parts = [p for p in [title, content, kw] if p]
    return ". ".join(parts)


def _check_toc(rows: List[Dict[str, Any]], label: str) -> None:
    needles = [
        "spis tre",  # Spis treści
        "table of contents",
        "introduction and table of contents",
    ]

    hits: List[str] = []
    for r in rows:
        hay = " ".join(
            str(r.get(k) or "")
            for k in ["chapter_title", "title", "content", "vector_input"]
        ).lower()
        if any(n in hay for n in needles):
            rid = str(r.get("id") or "").strip()
            hits.append(rid or "<missing-id>")

    if hits:
        preview = ", ".join(hits[:10])
        more = "" if len(hits) <= 10 else f" (+{len(hits) - 10} more)"
        print(f"[WARN] TOC check ({label}): {len(hits)} records matched ({preview}{more})")
    else:
        print(f"[OK] TOC check ({label}): 0 records matched")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--input_dir",
        default=str(PROJECT_ROOT / "data_helpers" / "records_data"),
        help="Directory with one or more *.jsonl files (hybrid search records)",
    )
    p.add_argument(
        "--model_id",
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        help="SentenceTransformers model id",
    )
    p.add_argument(
        "--work_dir",
        default=str(DEFAULT_WORK_DIR),
        help="Working directory root (default: temp_bundle_build/)",
    )
    p.add_argument("--batch_size", type=int, default=64)
    p.add_argument("--device", default="cpu")
    args = p.parse_args()

    in_dir = Path(args.input_dir)
    work_dir = Path(args.work_dir)

    if not in_dir.exists():
        raise FileNotFoundError(f"Input dir not found: {in_dir}")
    input_files = sorted([p for p in in_dir.glob("*.jsonl") if p.is_file()])
    if not input_files:
        raise FileNotFoundError(f"No *.jsonl files found in: {in_dir}")

    rows: List[Dict[str, Any]] = []
    for pth in input_files:
        rows.extend(_read_jsonl(pth))
    if not rows:
        raise RuntimeError(f"No records in {in_dir}")

    _check_toc(rows, label="before-embeddings")

    texts = [_build_text(r) for r in rows]

    # Lazy import
    import numpy as np
    from sentence_transformers import SentenceTransformer

    print(f"[INFO] Loading model: {args.model_id} (device={args.device})")
    model = SentenceTransformer(args.model_id, device=args.device)

    print(f"[INFO] Encoding {len(texts)} records (batch_size={int(args.batch_size)})")
    emb = model.encode(
        texts,
        batch_size=int(args.batch_size),
        show_progress_bar=True,
        normalize_embeddings=True,  # cosine-ready (L2)
    )
    emb_np = np.asarray(emb, dtype=np.float32)

    # Write embeddings
    emb_dir = work_dir / "embeddings_fp32"
    emb_dir.mkdir(parents=True, exist_ok=True)
    emb_path = emb_dir / "embeddings.f32.npy"
    np.save(str(emb_path), emb_np)

    # Write records_meta.jsonl with embedding_idx aligned to row index
    rec_dir = work_dir / "records"
    rec_dir.mkdir(parents=True, exist_ok=True)
    meta_path = rec_dir / "records_meta.jsonl"
    with meta_path.open("w", encoding="utf-8") as f:
        meta_rows: List[Dict[str, Any]] = []
        for i, r in enumerate(rows):
            r2 = dict(r)
            r2["embedding_idx"] = i
            # Remove fields that are not needed at runtime; keep vector_input out of meta.
            r2.pop("vector_input", None)
            meta_rows.append(r2)
            f.write(json.dumps(r2, ensure_ascii=False) + "\n")

    _check_toc(meta_rows, label="after-records_meta")

    print("[DONE]")
    print(f"  records:   {meta_path}")
    print(f"  embeddings:{emb_path} shape={emb_np.shape} dtype=float32")
    print(f"  inputs:    {len(input_files)} files ({in_dir})")


if __name__ == "__main__":
    main()

