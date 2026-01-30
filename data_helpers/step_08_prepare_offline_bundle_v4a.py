"""
Step 08: Assemble final offline_bundle/ folder (schema v4a).

Inputs (from temp_bundle_build/):
- records/records_meta.jsonl
- keyword_index/keyword_index.json
- embeddings_int8/embeddings.int8.bin
- embeddings_int8/embeddings.scale.f16.npy
- onnx_quant/<model_id>/model.int8.onnx
- tokenizer/<model_id>/tokenizer.model
- tokenizer/<model_id>/special_tokens.json (optional)

Output (single folder, source of truth):
- temp_bundle_build/offline_bundle/
  - manifest.json
  - records_meta.jsonl
  - keyword_index.json
  - embeddings.int8.bin
  - embeddings.scale.f16.npy
  - model/model.int8.onnx
  - model/tokenizer.model
  - model/special_tokens.json (optional)
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from data_helpers._common import WORK_DIR, safe_dir_name  # noqa: E402


def _count_jsonl(path: Path) -> int:
    n = 0
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                n += 1
    return n


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--model_id",
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        help="HuggingFace model id",
    )
    p.add_argument(
        "--work_dir",
        default=str(WORK_DIR),
        help="Working directory root (default: temp_bundle_build/)",
    )
    p.add_argument(
        "--max_length",
        type=int,
        default=128,
        help="Tokenizer max length (default: 128)",
    )
    args = p.parse_args()

    model_id = str(args.model_id).strip()
    work_dir = Path(args.work_dir)
    bundle_dir = work_dir / "offline_bundle"
    model_dir = bundle_dir / "model"

    records_in = work_dir / "records" / "records_meta.jsonl"
    kw_in = work_dir / "keyword_index" / "keyword_index.json"
    emb_bin_in = work_dir / "embeddings_int8" / "embeddings.int8.bin"
    emb_scale_in = work_dir / "embeddings_int8" / "embeddings.scale.f16.npy"
    onnx_in = work_dir / "onnx_quant" / safe_dir_name(model_id) / "model.int8.onnx"
    tok_in = work_dir / "tokenizer" / safe_dir_name(model_id) / "tokenizer.model"
    special_in = work_dir / "tokenizer" / safe_dir_name(model_id) / "special_tokens.json"

    for req in [records_in, kw_in, emb_bin_in, emb_scale_in, onnx_in, tok_in]:
        if not req.exists():
            raise FileNotFoundError(f"Missing required input: {req}")

    bundle_dir.mkdir(parents=True, exist_ok=True)
    model_dir.mkdir(parents=True, exist_ok=True)

    # Copy files
    shutil.copy2(str(records_in), str(bundle_dir / "records_meta.jsonl"))
    shutil.copy2(str(kw_in), str(bundle_dir / "keyword_index.json"))
    shutil.copy2(str(emb_bin_in), str(bundle_dir / "embeddings.int8.bin"))
    shutil.copy2(str(emb_scale_in), str(bundle_dir / "embeddings.scale.f16.npy"))
    shutil.copy2(str(onnx_in), str(model_dir / "model.int8.onnx"))
    shutil.copy2(str(tok_in), str(model_dir / "tokenizer.model"))
    if special_in.exists():
        shutil.copy2(str(special_in), str(model_dir / "special_tokens.json"))

    count = _count_jsonl(bundle_dir / "records_meta.jsonl")

    manifest = {
        "schema_version": "v4a",
        "count": count,
        "dim": 384,
        "embeddings_dtype": "int8",
        "embeddings_file": "embeddings.int8.bin",
        "embeddings_scale_dtype": "float16",
        "embeddings_scale_file": "embeddings.scale.f16.npy",
        "embeddings_quant": "int8_per_vector_scale",
        "model_id": model_id,
        "onnx_file": "model/model.int8.onnx",
        "tokenizer_type": "sentencepiece_unigram",
        "tokenizer_file": "model/tokenizer.model",
        "max_length": int(args.max_length),
        "pooling": "mean",
        "normalize": "l2",
        "notes": "INT8 ONNX + SentencePiece tokenizer.model + INT8 embeddings with per-vector scale",
    }
    (bundle_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # Enforce: tokenizer.json must not exist in bundle
    tok_json = model_dir / "tokenizer.json"
    if tok_json.exists():
        tok_json.unlink()

    print("[DONE]")
    print(f"  bundle_dir: {bundle_dir}")
    print(f"  count:      {count}")


if __name__ == "__main__":
    main()

