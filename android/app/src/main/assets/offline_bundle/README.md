# Offline Bundle (Android Assets)

This is the runtime location for the offline search bundle.

## Required Files

Copy from `assets/offline_bundle/` before building:

```
offline_bundle/
├── manifest.json
├── records_meta.jsonl
├── keyword_index.json
├── embeddings.int8.bin
├── embeddings.scale.f16.npy
└── model/
    ├── model.int8.onnx
    ├── tokenizer.model
    └── special_tokens.json
```

## Build Script

Use `build-release.ps1` in project root — it automatically copies the bundle here before building the APK.

```powershell
.\build-release.ps1
```

## Note

These files are **not tracked in Git**. Generate them using `data_helpers` tools.
