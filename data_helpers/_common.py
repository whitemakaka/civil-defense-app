from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORK_DIR = PROJECT_ROOT / "temp_bundle_build"


def safe_dir_name(model_id: str) -> str:
    return model_id.replace("/", "__").replace("\\", "__")

