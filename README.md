# Civil Defense Search

🔍 Offline search engine for civil defense guidance — find quotes from official handbooks instantly.

## About

Offline hybrid search (keyword + semantic) that runs entirely on your device. No internet connection required after installation.

- **Search Engine:** Keyword + Vector (sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
- **Languages:** Polish / English
- **Platform:** Android
- **Content:** Official civil defense handbooks (Poland)

## Features

- 🔍 **Hybrid Search** — combines keyword matching with semantic understanding
- 🔒 **100% Offline** — works without internet after installation
- 🛡️ **Privacy first** — no data collection, no telemetry, no query logging
- ⚡ **Fast & Efficient** — optimized for mobile devices
- 🌙 **Dark/Light mode** — AMOLED black for battery saving
- 🇵🇱🇬🇧 **Bilingual** — Polish and English interface + content
- 📱 **Mobile-first UI** — modern design with smooth animations

## How It Works

1. **You type** → query is tokenized and normalized (no diacritics)
2. **Keyword stage** → find top 150-400 candidates by keyword matching
3. **Vector stage** → rerank candidates by semantic similarity (cosine)
4. **Hybrid ranking** → combine scores: `α × semantic + β × keyword`
5. **Results** → display top 10 matching quotes with source info

**Search settings:**
- **Language filter:** PL / EN / All
- **Search mode:** Fast (150 candidates) / Accurate (400 candidates)
- **Sensitivity slider:** balance between semantic and keyword matching
- **Battery mode:** Eco (2 threads) / Performance (4 threads)
- **Auto-unload:** release model memory after idle

## Data Sources

Content is sourced from official Polish civil defense handbooks:

| # | Title (PL) | Title (EN) | Publisher |
|---|------------|------------|-----------|
| 1 | Bądź gotowy – poradnik na czas kryzysu i wojny | Get Ready | RCB (Rządowe Centrum Bezpieczeństwa) |
| 2 | Poradnik bezpieczeństwa | Safety Handbook | RCB |

**Links:**
- [Rządowe Centrum Bezpieczeństwa (RCB)](https://www.gov.pl/web/rcb)

## Embedding Model

**Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Dimension:** 384
- **Languages:** 50+ (including Polish and English)
- **License:** Apache 2.0
- **Source:** [Hugging Face](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)

**Bundle validation:**
The app validates the offline bundle on startup to ensure the embeddings were generated with the correct model. If there's a mismatch, vector search is disabled (keyword-only fallback).

## Security & Privacy

- ✅ App does not collect any user data
- ✅ App does not communicate with the internet after installation
- ✅ Queries are not logged or saved to disk
- ✅ Model runs locally on device
- ✅ Open source — verify the code yourself

## Installation

### From Google Play
*(Coming soon)*

### From APK (Releases)
1. Download APK from [Releases](../../releases)
2. Enable "Install from unknown sources" in Android settings
3. Install APK
4. Download offline bundle (if not included in APK)

### Offline Transfer (Nearby Share)
Already installed? Share APK to another phone via Nearby Share — no internet needed.

## Building from Source

### Prerequisites
```bash
npm install
```

### Generate Offline Bundle

The app requires an offline bundle (embeddings + records). See `src/search/README.md` for details.

**Quick summary:**
1. Prepare `records_meta.jsonl` (quotes from PDFs)
2. Generate embeddings using `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
3. Build keyword index: `python src/search/build_keyword_index.py`
4. Create `manifest.json` with model info
5. Place bundle in `assets/offline_bundle/`

### Build Android

**Important:** Before building, the offline bundle must be copied to Android assets.

**Option 1: Use build script (recommended)**
```powershell
.\build-release.ps1
```
This script automatically:
1. Copies bundle from `public/assets/offline_bundle/` → `android/app/src/main/assets/offline_bundle/`
2. Cleans and builds release APK

**Option 2: Manual build**
```bash
# 1. Copy bundle to Android assets
cp -r public/assets/offline_bundle/* android/app/src/main/assets/offline_bundle/

# 2. Prebuild for Android (if needed)
npx expo prebuild --platform android

# 3. Build APK
cd android
./gradlew assembleRelease
```

APK output: `android/app/build/outputs/apk/release/app-release.apk`

**Bundle locations:**
| Purpose | Path |
|---------|------|
| Source (development) | `public/assets/offline_bundle/` |
| Android build target | `android/app/src/main/assets/offline_bundle/` |

### Development

```bash
npm start
```

Then press `a` for Android emulator or scan QR with Expo Go app.

## Requirements

- **Android:** 8.0+ (API level 26+)
- **Storage:** ~100-500MB (depends on bundle size)
- **RAM:** ~300MB during search operation
- **Battery:** Eco mode recommended for extended use

## Project Structure

```
civil-defense-app/
├── src/
│   ├── features/
│   │   ├── search/          # Search feature (hybrid search logic)
│   │   │   ├── config.ts    # Model config (EMBEDDING_MODEL_ID, DIM)
│   │   │   ├── types/       # TypeScript types
│   │   │   ├── lib/         # Bundle validator, embedder
│   │   │   └── components/  # SearchResultCard, SearchDetailScreen
│   │   └── chat/            # Chat-like UI for search history
│   ├── stores/
│   │   └── settings/
│   │       ├── settingsStore.tsx       # App settings (lang, theme)
│   │       └── searchSettingsStore.tsx # Search settings (persistence)
│   ├── search/              # Python tooling for bundle generation
│   │   ├── offline_hybrid/  # Core search logic (Python)
│   │   └── build_keyword_index.py
│   └── samples/
│       └── offline_bundle/  # Example bundle structure
└── assets/
    └── offline_bundle/      # Production bundle (embeddings + records)
```

## Tech Stack

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Search:** Hybrid (keyword + vector)
- **Storage:** AsyncStorage (settings persistence)
- **Styling:** StyleSheet with custom theme system
- **Architecture:** bulletproof-react pattern

## Contributing

Contributions welcome! Please:
1. Follow existing code style
2. Keep privacy-first principles
3. Submit issues/PRs directly on GitHub

## Contact & Original Project

- **Official Repository:** [https://github.com/whitemakaka/civil-defense-app](https://github.com/whitemakaka/civil-defense-app)
- **GitHub Issues:** [Report a bug or security issue](https://github.com/whitemakaka/civil-defense-app/issues)
- **Email:** apps.whitemakaka@gmail.com
- **Twitter/X:** [@whitemakaka](https://x.com/whitemakaka)

*If you are viewing this on a fork, please refer to the official repository for the latest updates and security patches.*

## Future Ideas (Proposals)

These are potential directions for the project, with no commitment to implementation. Contributions in these areas are welcome:

- 🌍 **More countries** — adding data bundles for other regions (Lithuania, Latvia, Estonia, etc.)
- 🗺️ **Offline Shelter Maps** — integrating offline maps (e.g., OpenStreetMap) to show civil defense locations without internet

## License

**App:** MIT

**Embedding Model:** Apache 2.0 — [sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)

**Content:** Source materials are publicly available from RCB (Rządowe Centrum Bezpieczeństwa)

## Disclaimer

This app provides general guidance only and shows quotes from official handbooks. In emergency situations, always follow official instructions from local authorities.

---

**Built with ❤️ for offline resilience**
