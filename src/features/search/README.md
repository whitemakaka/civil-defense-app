# Search Feature

Offline hybrid search (keyword + vector) dla aplikacji mobilnej.

## Architektura

```
src/features/search/
├── config.ts                 # Stałe konfiguracyjne (model ID, dim)
├── types/                    # TypeScript types
│   └── index.ts             # Manifest, RecordMeta, SearchResult, Embedder
├── lib/
│   ├── bundleValidator.ts   # Walidacja bundle vs runtime embedder
│   └── embedder.ts          # TODO: Placeholder dla embeddera
├── hooks/
│   └── useHybridSearch.ts   # Hook do wyszukiwania (TODO: integracja)
└── components/
    ├── SearchResultCard.tsx
    └── SearchDetailScreen.tsx
```

## Integracja (TODO)

### 1. Dodaj embedder

Zamień placeholder w `lib/embedder.ts` na prawdziwy model:

```typescript
// src/features/search/lib/embedder.ts
import { EMBEDDING_MODEL_ID, EMBEDDING_DIM } from '../config';

class QueryEmbedder implements Embedder {
  async embed(text: string): Promise<Float32Array> {
    // TODO: Load model and embed query
    // Model MUST be: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
    // Output MUST be L2-normalized
    // Dim MUST be 384
  }

  getOutputDim(): number {
    return EMBEDDING_DIM;
  }

  getModelId(): string {
    return EMBEDDING_MODEL_ID;
  }
}
```

### 2. Load bundle przy starcie

```typescript
import { validateBundleManifest, formatValidationError } from './lib/bundleValidator';
import { loadBundle } from './lib/bundleLoader'; // TODO: implement

// Load manifest from assets
const manifest = await loadManifest(BUNDLE_PATH);

// Validate against embedder
const validation = validateBundleManifest(manifest, embedder);

if (!validation.valid) {
  // Show error to user
  Alert.alert('Bundle Error', formatValidationError(validation, language));
  // Fall back to keyword-only or block search
}

// Load full bundle
const index = await loadBundle(BUNDLE_PATH);
```

### 3. Wyszukiwanie

```typescript
// In useHybridSearch hook
const results = await search(
  index,
  query,
  {
    lang: languageFilter === 'all' ? undefined : languageFilter,
    topK: getTopK(),
    alpha,
    beta,
    candidateSetSize: getMaxCandidates(),
  }
);
```

## Walidacja Bundle

Aplikacja waliduje manifest przy starcie:

### MUST (errors - blokują wyszukiwanie)
- `manifest.model` == `EMBEDDING_MODEL_ID`
- `manifest.dim` == `embedder.getOutputDim()`
- `manifest.count` == `records.length`

### SHOULD (warnings)
- `manifest.schema_version` == `BUNDLE_SCHEMA_VERSION`

Jeśli walidacja się nie powiedzie:
- Zablokuj wyszukiwanie wektorowe
- Pokaż komunikat użytkownikowi
- (Opcjonalnie) fallback do keyword-only

## Konfiguracja Modelu

**Źródło prawdy:** `src/features/search/config.ts`

```typescript
export const EMBEDDING_MODEL_ID = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_DIM = 384;
export const EMBEDDING_DTYPE = 'float16';
export const BUNDLE_SCHEMA_VERSION = 'v1';
```

**Zasady:**
1. Bundle **MUSI** być wygenerowany tym samym modelem
2. Nie hardcoduj modelu w 2+ miejscach - użyj `config.ts`
3. Waliduj przy każdym load bundle

## Wyświetlanie w UI

### InfoModal

Pokazuje szczegóły bundle:
- Model: `manifest.model`
- Dimension: `manifest.dim`
- Data type: `manifest.dtype`
- Record count: `manifest.count`
- Version: `manifest.schema_version`

### Błędy walidacji

```typescript
if (!validation.valid) {
  // PL: "⚠️ Niezgodny bundle danych\n\n• Model mismatch: ..."
  // EN: "⚠️ Incompatible data bundle\n\n• Model mismatch: ..."
  const message = formatValidationError(validation, language);
  Alert.alert('Error', message);
}
```

## Privacy

- Brak logowania query/wyników
- Brak połączeń sieciowych
- Brak zapisu na dysk

## Testing

```bash
# TODO: Dodaj testy
npm test src/features/search
```

Sprawdź:
- Walidacja manifest (model mismatch, dim mismatch)
- Load bundle
- Search (keyword-only, hybrid)
- Normalizacja keyword_score
- Ranking (alpha/beta)
