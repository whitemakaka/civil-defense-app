# Search bundle

This directory contains the complete bundle included in the repository: the manifest, PL/EN notes with sources, records, local and global vectors, and the matching ONNX model and tokenizer in `model/`. The original PDF documents are not included.

The model and tokenizer do not need to be downloaded separately before building the app. The manifest lists the required paths and the SHA-256 hashes of the included files.

Notes and vectors are in separate files: `notes.jsonl`, `records.jsonl`, `embeddings.int8.bin` and `embeddings.scale.f16.npy`. A record's `embedding_idx` field points to its row in the vector files; `note_id` links the record to its note. Each language version of a note also points to its global vector through `global_embedding_idx`.

Your own notes require a complete matching bundle, including new records and vectors; replacing the text alone is not enough. The bundle preparation tools are maintained outside this repository.

The input path is set by `bundle_directory` in the root `build-config.json`. The `build-release.ps1` script checks the bundle and copies it into the Android assets.

Details: [bundle format](../../../docs/search-bundle/README.md).

Model license: Gemma Terms of Use (ai.google.dev/gemma/terms). If you copy or distribute the model, include the [NOTICE](../../../NOTICE) file, [GEMMA_TERMS_OF_USE.txt](../../../GEMMA_TERMS_OF_USE.txt) and [GEMMA_PROHIBITED_USE_POLICY.txt](../../../GEMMA_PROHIBITED_USE_POLICY.txt).
