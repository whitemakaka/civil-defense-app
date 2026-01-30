# DATA PREPARATION PIPELINE

## data_helpers

Purpose: keep **minimal examples and a step skeleton** needed to generate the offline bundle (v4a).

## How to use (quick)
- Start with `sample_example.json` — it defines the **data contract** (what must go into tokenization/embedding).
- `step_XX_*.py` files are **placeholders** for the pipeline steps (intentionally empty for now).

## Working directory (generated)
From **step 01 onward**, all intermediate artifacts should be produced inside a repo-root folder:

- `temp_bundle_build/`

This folder is **created by `step_01_download_model.py`** (it should not exist before running step 01) and is intended to contain:
- downloaded model snapshots
- ONNX export outputs
- tokenizer artifacts (`tokenizer.model`, `special_tokens.json`)
- embeddings outputs and quantization artifacts
- any temporary logs/reports

The final output folder is a single, source-of-truth path:
- `temp_bundle_build/offline_bundle/`

## Step order (v4a)
- `step_00_generate_ocr_and_samples.py` (Gemini Flash 3 Preview + Gemini Flash 3 Pro Preview)
- `step_01_download_model.py`
- `step_02_export_onnx.py`
- `step_03_quantize_onnx_int8.py`
- `step_04_prepare_sentencepiece_tokenizer.py`
- `step_05_generate_embeddings_fp32.py`
- `step_06_quantize_embeddings_int8_scale.py`
- `step_07_build_keyword_index.py`
- `step_08_prepare_offline_bundle_v4a.py`
- `step_09_validate_bundle_v4a.py`
- `step_10_make_offline_bundle.py`

## Step descriptions (short)
- **Step 00**: Generate OCR + hybrid-search records using Gemini (Flash for OCR + Flash Pro for structuring).
- **Step 01**: Create `temp_bundle_build/` and download the HF model snapshot into it.
- **Step 02**: Export the embedding model to ONNX (feature-extraction) into `temp_bundle_build/onnx_export/...`.
- **Step 03**: Quantize the ONNX model to INT8 (prefer static, fallback dynamic).
- **Step 04**: Prepare `tokenizer.model` (SentencePiece binary) + optional `special_tokens.json`.
- **Step 05**: Generate FP32 embeddings for all records (tokenize → ONNX → mean pooling → L2 normalize).
- **Step 06**: Quantize embeddings to INT8 + per-vector scale (v4a: `embeddings.int8.bin` + `embeddings.scale.f16.npy`).
- **Step 07**: Build `keyword_index.json` (fold/diacritics) from records.
- **Step 08**: Assemble the final `temp_bundle_build/offline_bundle/` folder.
- **Step 09**: Validate bundle artifacts (shapes, checksums, cosine sanity).
- **Step 10**: Copy the bundle into your app assets (optional).

## How to run each step (PowerShell)
Step scripts are meant to be executed from the repo root.

## Run everything with one command
```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\run_all.py
```

**Step 01 (download model snapshot)**
- IN: HuggingFace `model_id` (default in script)
- OUT: `temp_bundle_build/hf_models/<model_id>/...`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_01_download_model.py
```

**Step 02 (export ONNX)**
- IN: `temp_bundle_build/hf_models/<model_id>/...` (preferred) OR model id from Hub
- OUT: `temp_bundle_build/onnx_export/<model_id>/model.onnx`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_02_export_onnx.py
```

**Step 03 (quantize ONNX → INT8)**
- IN: `temp_bundle_build/onnx_export/<model_id>/model.onnx`
- OUT: `temp_bundle_build/onnx_quant/<model_id>/model.int8.onnx`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_03_quantize_onnx_int8.py
```

**Step 04 (prepare SentencePiece tokenizer.model + special_tokens.json)**
- IN: HuggingFace `model_id` (uses local snapshot if present)
- OUT:
  - `temp_bundle_build/tokenizer/<model_id>/tokenizer.model`
  - `temp_bundle_build/tokenizer/<model_id>/special_tokens.json`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_04_prepare_sentencepiece_tokenizer.py
```

**Step 05 (generate FP32 embeddings from records JSONL)**
- IN: `data_helpers/records_data/*.jsonl` (all JSONL files in the directory, sorted by filename)
- OUT:
  - `temp_bundle_build/records/records_meta.jsonl`
  - `temp_bundle_build/embeddings_fp32/embeddings.f32.npy`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_05_generate_embeddings_fp32.py
```

**Step 06 (quantize embeddings → INT8 + per-vector scale)**
- IN: `temp_bundle_build/embeddings_fp32/embeddings.f32.npy`
- OUT:
  - `temp_bundle_build/embeddings_int8/embeddings.int8.bin`
  - `temp_bundle_build/embeddings_int8/embeddings.scale.f16.npy`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_06_quantize_embeddings_int8_scale.py
```

**Step 07 (build keyword_index.json)**
- IN: `temp_bundle_build/records/records_meta.jsonl` (must contain `embedding_idx` + `keywords[]`)
- OUT: `temp_bundle_build/keyword_index/keyword_index.json`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_07_build_keyword_index.py
```

**Step 08 (assemble offline_bundle/ v4a)**
- IN: artifacts from `temp_bundle_build/` (records, keyword_index, embeddings_int8, onnx_quant, tokenizer)
- OUT: `temp_bundle_build/offline_bundle/`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_08_prepare_offline_bundle_v4a.py
```

**Step 09 (validate offline_bundle/ v4a)**
- IN: `temp_bundle_build/offline_bundle/`
- OUT: console report (raises on mismatch)

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_09_validate_bundle_v4a.py
```

**Step 10 (copy into app assets)**
- IN: `temp_bundle_build/offline_bundle/`
- OUT: `<YOUR_APP_ASSETS>/offline_bundle/`

```powershell
& "$env:LocalAppData\Programs\Python\Launcher\py.exe" .\data_helpers\step_10_make_offline_bundle.py --out_dir "C:\PATH\TO\YOUR_APP\assets"
```

Optional: step 10 copies the bundle into your React Native app assets (Android offline bundle).

## Step 00 (upstream data generation)
Before running the v4a pipeline, you need the source dataset:
- OCR outputs (per document)
- Hybrid-search records (JSONL lines with `vector_input`)

Recommended models used in this project:
- **Gemini Flash 3 Preview**: OCR / fast extraction
- **Gemini Flash 3 Pro Preview**: higher-quality structuring (quotes + keywords + vector_input)

## Sample file naming
When exporting curated samples to another repository, keep names short and explicit.

If `country=PL` is the grouping key (Poland), keep a single file, e.g.:
- `hybrid_search_records_pl.jsonl`

This file may contain mixed languages (e.g. `lang=pl` and `lang=en`) as long as `country=PL`.
