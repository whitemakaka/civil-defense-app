# Civil Defence

Offline semantic search for civil-defence and emergency-preparedness guidance, in Polish and English.

Find practical notes by describing your question in your own words. Search runs on the device and returns complete notes with their sources. The app retrieves prepared content; it does not generate answers.

## Features

- **Semantic search:** matches the meaning of a question against individual passages and complete notes.
- **One result per note:** local and global matches are combined without duplicate results.
- **Relevant results only:** search starts at 3 characters; results below the relevance threshold are hidden.
- **Complete guidance:** each result opens the full note, including its source references.
- **Offline operation:** the model and search data are bundled into the installed app.
- **Polish and English:** interface and note content are available in both languages.
- **Light and dark themes.**
- **Local privacy:** no search telemetry or query logging; conversation history stays in memory.

## How search works

1. The question is embedded locally using **OPI-PIB/PolDense-17M** through ONNX Runtime.
2. Its vector is compared with the local passage vectors and global whole-note vectors for the selected language.
3. Each note is ranked using its best local match and its global match. The weights come from the bundle manifest.
4. Results are grouped by note. The preview shows the best-matching passage; selecting it opens the complete note.
5. Results are shown only when the best one scores at least `relevance_floor`, and only those within `relevance_delta` of the best. If nothing passes, the app reports that there is no good match.

The model uses an ONNX FP32 export and a ByteLevel BPE tokenizer. Document vectors are stored as INT8 with a per-vector FP16 scale. The model context limit and runtime parameters, including `minimum_query_length`, the local/global weights, `top_k` and the relevance threshold, are read from the `search` block of the manifest.

Technical details: [model](docs/model/README.md) and [search bundle](docs/search-bundle/README.md).

## Content and sources

Notes are prepared from civil-defence guides and public-safety guidance. The supplied bundle determines the available content. Each note includes its document references, page numbers or source links; the app also displays a source catalog.

Search and reading bundled notes work offline. Opening an external source website requires a connection.

## Repository scope

This repository contains the Android application, its tests, build configuration and documentation. Model preparation, content editing and embedding generation are handled separately.

**A complete, compatible offline bundle is required to build and run the app.** Prepared Polish and English notes, local and global vectors, records and the manifest are included in [public/assets/offline_bundle/](public/assets/offline_bundle/README.md). The matching ONNX model and tokenizer are also included in its `model/` directory; no separate model download is needed. The tools that produce the bundle are maintained separately. The app does not download missing search assets on first launch.

Private signing keys, passwords, local environment files, machine-specific SDK paths and generated build artifacts are excluded. Keep those files outside the public repository.

## Building from source

### Requirements

- Node.js and npm, compatible with the dependencies in `package-lock.json`.
- A JDK and Android SDK compatible with the included Android project.
- PowerShell for the release build script.
- The complete offline bundle included in this repository, with notes, vectors, model and tokenizer.

Set `JAVA_HOME` and `ANDROID_HOME` in your local environment. Run the following commands from the repository root.

### Prepare dependencies and assets

```powershell
npm ci
```

The complete ready-to-use bundle is already in `public/assets/offline_bundle/`, including the matching model and tokenizer in `model/`. No separate data or model download is needed. Required file paths and SHA-256 hashes are listed in `manifest.json`. To use a different bundle location, change `bundle_directory` in `build-config.json`.

To use your own notes, prepare a complete replacement bundle with matching records and local/global vectors using the same model and tokenizer. Editing only the note text leaves the search vectors out of sync. Bundle-generation tools are not included in this repository.

All bundle files must belong to the same prepared dataset and model. See the [bundle format](docs/search-bundle/README.md) for the required structure.

### Validate and build

With the included bundle:

```powershell
npx tsc --noEmit
npm test
.\build-release.ps1 -JavaHome $env:JAVA_HOME
```

The release script checks the bundle's file hashes and local/global vector counts, runs the application checks, copies the bundle into Android assets, and builds both outputs:

| Output | Path |
| --- | --- |
| Unsigned APK | `dist/civil-defense-app-release-unsigned.apk` |
| Unsigned Android App Bundle | `dist/civil-defense-app-release-unsigned.aab` |

`npm test` runs the Node tests in `tests/*.test.cjs` against the bundle configured in `build-config.json`.

Release builds include only ARM native libraries (`armeabi-v7a`, `arm64-v8a`), without x86 libraries for emulators, and the code is minified with R8. Resource shrinking is disabled because images referenced from JavaScript are resolved by name at runtime. Testing on an emulator requires an ARM system image or a separate debug build.

Release builds have no Internet or storage permission: `android/app/src/release/AndroidManifest.xml` removes `INTERNET` (kept only in debug builds for Metro) and the `READ/WRITE_EXTERNAL_STORAGE` permissions added by the file libraries. Only `ACCESS_NETWORK_STATE` from ONNX Runtime remains; it allows no network access and needs no user consent. External links open in the system browser, and the "112" button opens the dialer with 112 filled in. UI icons come from `@expo/vector-icons`; copying text uses `expo-clipboard`.

**Public release builds are unsigned.** Sign them with your own key before installation or publication. The public Android package is `com.anonymous.civildefence`.

### Development

Once the Android assets have been prepared by the release script:

```powershell
npm run android
```

Development uses a native Android build, including the custom search module and ONNX Runtime. Expo Go alone cannot run these native modules. Android tooling manages the standard debug key locally.

## Project structure

```text
src/                   Application UI, search logic and settings
android/               Android project, native tokenizer and vector scoring
assets/images/         Application graphics
public/assets/         Complete offline bundle, including model and tokenizer
tests/                 Application tests
docs/                  Model and bundle documentation
build-config.json      Bundle location
build-release.ps1      Bundle validation and APK/AAB build
```

The runtime assets are copied into `android/app/src/main/assets/offline_bundle/`. The complete input bundle is included in the repository; its generated Android copy and build outputs are excluded by `.gitignore`.

## Privacy and security

Search runs locally. Queries are not transmitted to a search service or saved to disk. The selected language and theme are saved in a local app file (`settings.json` in the app's private documents directory). The app also stores a welcome-screen completion flag. The model is read directly from the installed app; no second copy is written to storage. External links open a browser or another application with its own data handling.

See the [privacy policy](PRIVACY_POLICY.md), [data policy](DATA_POLICY.md) and [security policy](SECURITY.md).

## Contributing and contact

Issues and pull requests are welcome. Keep search offline, preserve source attribution and include relevant checks with changes.

- [Project repository](https://github.com/whitemakaka/civil-defense-app)
- [Issue tracker](https://github.com/whitemakaka/civil-defense-app/issues)
- [Contact](mailto:apps.whitemakaka@gmail.com)
- [X](https://x.com/whitemakaka)

### Making your own version

The links shown in the app's information window are set in `src/config/links.json`. The source code, email and X fields are empty in this repository; fill them in with your own links and replace the website link. Change the package name in `app.json` and `android/app/build.gradle` (and the matching Kotlin package folder). Release builds from this repository are unsigned, so sign the APK or AAB with your own key before distributing it.

## License

Application code: [MIT](LICENSE). Source materials retain their respective licenses; consult their original publications before redistributing them.

The included model, [OPI-PIB/PolDense-17M](https://huggingface.co/OPI-PIB/PolDense-17M), is provided under the [Gemma Terms of Use](https://ai.google.dev/gemma/terms). It was converted to ONNX format, with CLS pooling and L2 normalisation added to its output; the weights were not retrained. Use of the model is subject to the [Gemma Prohibited Use Policy](https://ai.google.dev/gemma/prohibited_use_policy). Copies are included in [GEMMA_TERMS_OF_USE.txt](GEMMA_TERMS_OF_USE.txt) and [GEMMA_PROHIBITED_USE_POLICY.txt](GEMMA_PROHIBITED_USE_POLICY.txt). If you copy or distribute the model, include the [NOTICE](NOTICE) file and both copies, and pass on these use restrictions. The same notice is packaged into the app from `android/app/src/main/assets/NOTICE`.

The app provides general preparedness information. In an emergency, follow current instructions from the relevant authorities and emergency services.
