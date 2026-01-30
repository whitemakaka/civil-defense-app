"""
Step 01: Download base model artifacts locally (HF).

This script creates the working directory `temp_bundle_build/` and downloads the
SentenceTransformers model snapshot there (no symlinks).
"""

from __future__ import annotations

import argparse
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


def _safe_dir_name(model_id: str) -> str:
    return model_id.replace("/", "__").replace("\\", "__")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--model_id",
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        help="HuggingFace model id",
    )
    p.add_argument(
        "--out_dir",
        default=str(WORK_DIR),
        help="Working directory root (default: temp_bundle_build/)",
    )
    args = p.parse_args()

    model_id = str(args.model_id).strip()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    model_dir = out_dir / "hf_models" / _safe_dir_name(model_id)
    model_dir.mkdir(parents=True, exist_ok=True)

    # Lazy import: keeps the repo importable without HF deps installed.
    from huggingface_hub import hf_hub_download, snapshot_download

    print(f"[INFO] Downloading model snapshot: {model_id}")
    snapshot_download(
        repo_id=model_id,
        local_dir=str(model_dir),
        local_dir_use_symlinks=False,
        resume_download=True,
    )

    # Ensure SentencePiece binary is available (needed for v4/v4a tokenization).
    try:
        hf_hub_download(
            repo_id=model_id,
            filename="sentencepiece.bpe.model",
            local_dir=str(model_dir),
        )
    except Exception:
        # Not all models provide this filename; export/tokenizer steps may handle alternatives.
        pass

    print("[DONE]")
    print(f"  work_dir:  {out_dir}")
    print(f"  model_dir: {model_dir}")


if __name__ == "__main__":
    main()
