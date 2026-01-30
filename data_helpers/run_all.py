"""
Run the full v4a pipeline (steps 01..09) sequentially.

This uses the current Python interpreter (sys.executable) and stops on the first error.
Step 10 is optional (copy into app assets) and is NOT run here.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


HERE = Path(__file__).resolve().parent

STEPS = [
    "step_01_download_model.py",
    "step_02_export_onnx.py",
    "step_03_quantize_onnx_int8.py",
    "step_04_prepare_sentencepiece_tokenizer.py",
    "step_05_generate_embeddings_fp32.py",
    "step_06_quantize_embeddings_int8_scale.py",
    "step_07_build_keyword_index.py",
    "step_08_prepare_offline_bundle_v4a.py",
    "step_09_validate_bundle_v4a.py",
]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--from_step",
        default=STEPS[0],
        help=f"Start from this step filename (default: {STEPS[0]})",
    )
    args, passthrough = p.parse_known_args()

    if args.from_step not in STEPS:
        raise SystemExit(f"Unknown --from_step: {args.from_step}. Must be one of: {', '.join(STEPS)}")

    start_idx = STEPS.index(args.from_step)

    for step in STEPS[start_idx:]:
        step_path = HERE / step
        if not step_path.exists():
            raise SystemExit(f"Missing step script: {step_path}")

        cmd = [sys.executable, str(step_path), *passthrough]
        print("\n" + "=" * 80)
        print("[RUN]", " ".join(cmd))
        print("=" * 80)
        subprocess.run(cmd, check=True)

    print("\n[DONE] v4a pipeline completed")


if __name__ == "__main__":
    main()

