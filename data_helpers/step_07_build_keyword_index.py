"""
Step 07: Build keyword_index.json (fold/diacritics) from records_meta.jsonl.

Input:
- temp_bundle_build/records/records_meta.jsonl (must contain embedding_idx + keywords[])

Output:
- temp_bundle_build/keyword_index/keyword_index.json
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Set


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


def fold_text(s: str) -> str:
    s = (s or "").lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return s.strip()


def tokenize_folded(text: str) -> List[str]:
    t = fold_text(text)
    parts = re.split(r"[^a-z0-9]+", t)
    return [p for p in parts if p]


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
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


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--work_dir",
        default=str(DEFAULT_WORK_DIR),
        help="Working directory root (default: temp_bundle_build/)",
    )
    p.add_argument("--min_len", type=int, default=3)
    args = p.parse_args()

    work_dir = Path(args.work_dir)
    in_path = work_dir / "records" / "records_meta.jsonl"
    if not in_path.exists():
        raise FileNotFoundError(f"Missing records meta: {in_path}")

    rows = read_jsonl(in_path)
    idx: Dict[str, Set[int]] = {}

    for r in rows:
        emb_idx = r.get("embedding_idx")
        if not isinstance(emb_idx, int):
            continue
        keywords = r.get("keywords") or []
        if not isinstance(keywords, list):
            continue
        for k in keywords:
            for tok in tokenize_folded(str(k)):
                if len(tok) < int(args.min_len):
                    continue
                idx.setdefault(tok, set()).add(emb_idx)

    out_dir = work_dir / "keyword_index"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "keyword_index.json"
    out_obj = {k: sorted(list(v)) for k, v in idx.items()}
    out_path.write_text(json.dumps(out_obj, ensure_ascii=False), encoding="utf-8")

    print("[DONE]")
    print(f"  keyword_index: {out_path} (tokens={len(out_obj)})")


if __name__ == "__main__":
    main()

