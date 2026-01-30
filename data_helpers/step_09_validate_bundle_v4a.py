"""
Step 09: Validate offline_bundle/ (v4a).

Checks:
- required files exist
- tokenizer.json is NOT present
- record count matches embeddings sizes
- basic stats for reconstructed embeddings (scale * int8)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from data_helpers._common import WORK_DIR  # noqa: E402


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
        "--bundle_dir",
        default=str(WORK_DIR / "offline_bundle"),
        help="Path to offline bundle folder (default: ./temp_bundle_build/offline_bundle)",
    )
    args = p.parse_args()

    bundle_dir = Path(args.bundle_dir)
    manifest_path = bundle_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    required = [
        "records_meta.jsonl",
        "keyword_index.json",
        "embeddings.int8.bin",
        "embeddings.scale.f16.npy",
        "model/model.int8.onnx",
        "model/tokenizer.model",
    ]
    for rel in required:
        pth = bundle_dir / rel
        if not pth.exists():
            raise FileNotFoundError(f"Missing required file: {pth}")

    tok_json = bundle_dir / "model" / "tokenizer.json"
    if tok_json.exists():
        raise RuntimeError(f"Forbidden file present: {tok_json}")

    count_records = _count_jsonl(bundle_dir / "records_meta.jsonl")
    dim = int(manifest.get("dim") or 384)
    count_manifest = int(manifest.get("count") or 0)
    if count_manifest and count_manifest != count_records:
        raise RuntimeError(f"count mismatch: manifest={count_manifest} records={count_records}")

    # Validate embeddings sizes
    emb_bin = bundle_dir / "embeddings.int8.bin"
    expected_bytes = count_records * dim
    if emb_bin.stat().st_size != expected_bytes:
        raise RuntimeError(
            f"embeddings.int8.bin size mismatch: got={emb_bin.stat().st_size} expected={expected_bytes}"
        )

    import numpy as np

    scales = np.load(str(bundle_dir / "embeddings.scale.f16.npy")).astype(np.float32)
    if scales.shape != (count_records,):
        raise RuntimeError(f"scale shape mismatch: got={scales.shape} expected=({count_records},)")

    # Basic stats on reconstructed vectors (first 100 only)
    raw = np.fromfile(str(emb_bin), dtype=np.int8)
    raw = raw.reshape((count_records, dim)).astype(np.float32)
    sample = raw[: min(100, count_records)] * scales[: min(100, count_records), None]
    norms = np.linalg.norm(sample, axis=1)

    print("[OK] Bundle v4a validated")
    print(f"  bundle_dir: {bundle_dir}")
    print(f"  count:      {count_records}")
    print(f"  dim:        {dim}")
    print(f"  norms(sample) min={norms.min():.4f} max={norms.max():.4f} avg={norms.mean():.4f}")


if __name__ == "__main__":
    main()

