"""
Step 02: Export the embedding model to ONNX (feature-extraction).

Input:
- temp_bundle_build/hf_models/<model_id>/ (from step 01) OR a HuggingFace model id

Output:
- temp_bundle_build/onnx_export/<model_id>/model.onnx

Notes:
- Exports a feature-extraction graph (token embeddings / last hidden state).
- Quantization is done in step 03.
"""

from __future__ import annotations

import argparse
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


def _safe_dir_name(model_id: str) -> str:
    return model_id.replace("/", "__").replace("\\", "__")


def _resolve_model_path(work_dir: Path, model_id: str) -> str:
    """
    Prefer local snapshot from step 01 if present; otherwise fall back to HF model id.
    """
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
    p.add_argument(
        "--opset",
        type=int,
        default=18,
        help="ONNX opset (default: 18)",
    )
    args = p.parse_args()

    model_id = str(args.model_id).strip()
    work_dir = Path(args.work_dir)
    out_dir = work_dir / "onnx_export" / _safe_dir_name(model_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    model_path_or_id = _resolve_model_path(work_dir, model_id)

    # Lazy import: keeps the repo importable without deps installed.
    from optimum.exporters.onnx import main_export

    print(f"[INFO] Exporting to ONNX (task=feature-extraction, opset={int(args.opset)})")
    print(f"[INFO] model: {model_path_or_id}")
    print(f"[INFO] out:   {out_dir}")

    main_export(
        model_name_or_path=model_path_or_id,
        output=out_dir,
        task="feature-extraction",
        opset=int(args.opset),
        device="cpu",
    )

    onnx_path = out_dir / "model.onnx"
    if not onnx_path.exists():
        raise FileNotFoundError(f"ONNX export failed (missing): {onnx_path}")

    print("[DONE]")
    print(f"  onnx: {onnx_path} ({onnx_path.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()

