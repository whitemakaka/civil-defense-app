"""
Step 04: Prepare SentencePiece tokenizer.model (binary) + special tokens map.

Input:
- HuggingFace model id (downloaded in step 01 or fetched from Hub)

Output:
- temp_bundle_build/tokenizer/<model_id>/tokenizer.model
- temp_bundle_build/tokenizer/<model_id>/special_tokens.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


def _safe_dir_name(model_id: str) -> str:
    return model_id.replace("/", "__").replace("\\", "__")


def _resolve_model_path(work_dir: Path, model_id: str) -> str:
    local = work_dir / "hf_models" / _safe_dir_name(model_id)
    if local.exists():
        return str(local)
    return model_id


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--model_id",
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        help="HuggingFace model id",
    )
    p.add_argument(
        "--work_dir",
        default=str(DEFAULT_WORK_DIR),
        help="Working directory root (default: temp_bundle_build/)",
    )
    args = p.parse_args()

    model_id = str(args.model_id).strip()
    work_dir = Path(args.work_dir)
    model_path_or_id = _resolve_model_path(work_dir, model_id)

    out_dir = work_dir / "tokenizer" / _safe_dir_name(model_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Prefer the real SentencePiece binary shipped by XLM-R style tokenizers.
    from huggingface_hub import hf_hub_download
    from transformers import AutoTokenizer

    tok_bin = out_dir / "tokenizer.model"
    # Idempotency: on Windows, renaming to an existing target raises FileExistsError.
    # If tokenizer.model already exists and is non-empty, we reuse it.
    if not (tok_bin.exists() and tok_bin.stat().st_size > 0):
        sp_path = hf_hub_download(
            repo_id=model_id,
            filename="sentencepiece.bpe.model",
            local_dir=str(out_dir),
        )
        sp_src = Path(sp_path)
        if sp_src.name != tok_bin.name:
            # Overwrite if needed (safe for re-runs).
            sp_src.replace(tok_bin)

    tokenizer = AutoTokenizer.from_pretrained(model_path_or_id)
    special: Dict[str, Any] = {
        "bos_token": tokenizer.bos_token,
        "eos_token": tokenizer.eos_token,
        "unk_token": tokenizer.unk_token,
        "pad_token": tokenizer.pad_token,
        "bos_token_id": tokenizer.bos_token_id,
        "eos_token_id": tokenizer.eos_token_id,
        "unk_token_id": tokenizer.unk_token_id,
        "pad_token_id": tokenizer.pad_token_id,
        "model_max_length": min(int(getattr(tokenizer, "model_max_length", 128) or 128), 128),
        "uses_metaspace": True,
    }
    (out_dir / "special_tokens.json").write_text(
        json.dumps(special, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("[DONE]")
    print(f"  tokenizer_model: {tok_bin} ({tok_bin.stat().st_size / 1024:.1f} KB)")
    print(f"  special_tokens:  {out_dir / 'special_tokens.json'}")


if __name__ == "__main__":
    main()

