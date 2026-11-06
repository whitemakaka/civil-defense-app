# Android search assets

This directory holds the bundle used by the app on the device. `build-release.ps1` copies it from the location set in the root `build-config.json`.

The complete bundle, including notes, records, vectors, the manifest, the model and the tokenizer, is included in `public/assets/offline_bundle/`. The script checks the manifest and SHA-256 hashes. The generated Android assets are excluded from the repository.
