# Search bundle

The complete bundle is included in this repository in `public/assets/offline_bundle/`: prepared notes, records, vectors, the manifest, and the model and tokenizer in `model/`. The manifest lists the required files and their SHA-256 hashes. The app uses the directory set by `bundle_directory` in `build-config.json`. The included notes and vectors can be used without preparing the data again and without downloading the model separately.

Your own notes require a complete new bundle with matching records and local/global vectors. The bundle preparation tools are not part of this repository; changing the note text alone does not update the embeddings.

A complete bundle required for building contains:

- `manifest.json`: search parameters, asset paths, record counts and SHA-256 hashes;
- `records.jsonl`: local and global records for each language;
- `notes.jsonl`: complete PL and EN notes with their sources;
- INT8 embeddings with an FP16 scale for each record;
- the ONNX FP32 model and tokenizer files, included in `model/`.

Asset names are read from the manifest. Do not mix files from different bundles.

## Linking vectors to notes

Each note passage has a local embedding. The whole note with its title also has a global embedding, separately for each language. A record contains:

- `id`: a unique record and language identifier;
- `note_id`: the shared identifier of the whole note;
- `embedding_scope`: `local` or `global`;
- `line_index`: the passage order; `null` for the whole note;
- `lang`, `topic`, `subtopic`, `text` and `embedding_idx`.

Each language version of a note has a `global_embedding_idx` pointing to its global vector. Grouping by `note_id` ensures one result per note.

Ranking combines the best local score with the global score. The weights are set by `search.local_weight` and `search.global_weight` in the manifest. The result preview shows the best-matching passage, and selecting a result opens the complete note.

## Sources and bundle checks

A document source contains `source`, `title`, `country` and a `pages` list with ascending, unique page numbers. A web source uses `pages: []` and a full HTTP(S) address in `url`. Source identifiers, pages and addresses match between PL and EN; titles and country names are translated.

`build-release.ps1` checks that the vectors are complete, verifies the SHA-256 hashes of the assets and runs the application checks. Only then does it replace the assets in `android/app/src/main/assets/offline_bundle/`. A missing bundle or mismatched files stop the build.
