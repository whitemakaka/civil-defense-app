"""
Step 06: Quantize FP32 embeddings to INT8 + per-vector scale (v4a).

Input:
- temp_bundle_build/embeddings_fp32/embeddings.f32.npy

Output:
- temp_bundle_build/embeddings_int8/embeddings.int8.bin
- temp_bundle_build/embeddings_int8/embeddings.scale.f16.npy
"""

from __future__ import annotations

import argparse
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--work_dir",
        default=str(DEFAULT_WORK_DIR),
        help="Working directory root (default: temp_bundle_build/)",
    )
    args = p.parse_args()

    work_dir = Path(args.work_dir)
    in_path = work_dir / "embeddings_fp32" / "embeddings.f32.npy"
    if not in_path.exists():
        raise FileNotFoundError(f"Missing embeddings: {in_path}")

    import numpy as np

    emb = np.load(str(in_path)).astype(np.float32)
    if emb.ndim != 2:
        raise RuntimeError(f"Expected 2D embeddings array, got shape={emb.shape}")

    # scale[i] = max(abs(vec))/127
    absmax = np.max(np.abs(emb), axis=1)
    scale = absmax / 127.0
    scale = np.where(scale == 0, 1e-8, scale).astype(np.float16)

    # int8 = round(fp32/scale) clamped to [-127,127]
    scale_f32 = scale.astype(np.float32)
    q = np.rint(emb / scale_f32[:, None])
    q = np.clip(q, -127, 127).astype(np.int8)

    out_dir = work_dir / "embeddings_int8"
    out_dir.mkdir(parents=True, exist_ok=True)

    out_bin = out_dir / "embeddings.int8.bin"
    out_scale = out_dir / "embeddings.scale.f16.npy"

    q.tofile(str(out_bin))
    np.save(str(out_scale), scale)

    print("[DONE]")
    print(f"  embeddings_int8:  {out_bin} bytes={out_bin.stat().st_size}")
    print(f"  embeddings_scale: {out_scale} shape={scale.shape} dtype=float16")


if __name__ == "__main__":
    main()

