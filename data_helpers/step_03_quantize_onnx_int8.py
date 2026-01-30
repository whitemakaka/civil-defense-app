"""
Step 03: Quantize ONNX model to INT8 (dynamic quantization).

Input:
- temp_bundle_build/onnx_export/<model_id>/model.onnx

Output:
- temp_bundle_build/onnx_quant/<model_id>/model.int8.onnx
"""

from __future__ import annotations

import argparse
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


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
        "--work_dir",
        default=str(DEFAULT_WORK_DIR),
        help="Working directory root (default: temp_bundle_build/)",
    )
    args = p.parse_args()

    model_id = str(args.model_id).strip()
    work_dir = Path(args.work_dir)

    in_onnx = work_dir / "onnx_export" / _safe_dir_name(model_id) / "model.onnx"
    if not in_onnx.exists():
        raise FileNotFoundError(f"Missing ONNX export: {in_onnx}")

    out_dir = work_dir / "onnx_quant" / _safe_dir_name(model_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_onnx = out_dir / "model.int8.onnx"

    from onnxruntime.quantization import QuantType, quantize_dynamic

    print("[INFO] Quantizing ONNX -> INT8 (dynamic)")
    print(f"[INFO] in:  {in_onnx}")
    print(f"[INFO] out: {out_onnx}")

    quantize_dynamic(
        model_input=str(in_onnx),
        model_output=str(out_onnx),
        weight_type=QuantType.QUInt8,
    )

    print("[DONE]")
    print(f"  onnx_int8: {out_onnx} ({out_onnx.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()

