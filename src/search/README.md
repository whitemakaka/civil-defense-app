# Offline Hybrid Search

Moduł wyszukiwania offline łączący dopasowanie słów kluczowych z podobieństwem wektorowym.

## Bundle Format

Folder bundle zawiera:

```
offline_bundle/
├── manifest.json
├── records_meta.jsonl
├── embeddings.f16.npy (lub .npy dla float32)
└── keyword_index.json
```

### manifest.json

**WAŻNE:** Manifest zawiera informacje o modelu embeddingów. Aplikacja MUSI używać tego samego modelu, inaczej wyniki będą błędne.

```json
{
  "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  "dim": 384,
  "dtype": "float16",
  "count": 1234,
  "schema_version": "v1",
  "records_file": "records_meta.jsonl",
  "embeddings_file": "embeddings.f16.npy",
  "keyword_index_file": "keyword_index.json"
}
```

**Pola:**
- `model` (string) - pełna nazwa modelu użytego do embedowania (MUST match runtime embedder)
- `dim` (int) - wymiar embeddingów (np. 384)
- `dtype` (string) - typ danych: "float16" lub "float32"
- `count` (int) - liczba rekordów w datasecie
- `schema_version` (string) - wersja formatu bundle (np. "v1")
- `records_file` (string) - nazwa pliku z rekordami
- `embeddings_file` (string) - nazwa pliku z embeddingami
- `keyword_index_file` (string) - nazwa pliku z keyword index (opcjonalne)

### records_meta.jsonl

Każda linia to JSON z polami:

```json
{
  "id": "badz_gotowy_001",
  "lang": "pl",
  "source": "badz_gotowy",
  "doc_title": "Bądź gotowy – poradnik na czas kryzysu i wojny",
  "doc_stem": "badz_gotowy",
  "chapter_title": "Przygotowanie zapasów",
  "page": 12,
  "title": "Zapasy wody pitnej",
  "content": "Na osobę należy przygotować minimum 3 litry wody dziennie...",
  "keywords": ["woda", "zapasy", "picie"],
  "keywords_folded": ["woda", "zapasy", "picie"],
  "embedding_idx": 0
}
```

**Źródła danych (doc_stem / doc_title):**

Dokumenty dostępne w dwóch wersjach językowych:

| doc_stem | PL doc_title | EN doc_title |
|----------|--------------|--------------|
| `badz_gotowy` | Bądź gotowy – poradnik na czas kryzysu i wojny | Get Ready |
| `poradnik_bezpieczenstwa` | Poradnik bezpieczeństwa | Safety Handbook |

### embeddings.f16.npy (lub .npy)

NumPy array `(N, D)` float16 lub float32, **L2-normalized**. Każdy wiersz odpowiada `embedding_idx`.

**UWAGA:** Embeddingi MUSZĄ być znormalizowane (L2 norm = 1.0) aby cosine similarity = dot product.

### keyword_index.json

Odwrócony indeks: token → lista embedding_idx.

```json
{
  "ewakuacja": [0, 15, 42],
  "plecak": [0, 3, 99],
  "woda": [1, 2, 5, 10]
}
```

## Walidacja Bundle

Aplikacja waliduje bundle przy starcie:

1. **Model mismatch**: Bundle używa innego modelu niż runtime → ERROR, blokada wyszukiwania wektorowego
2. **Dimension mismatch**: `manifest.dim != embedder.output_dim` → ERROR
3. **Count mismatch**: `manifest.count != len(records)` → ERROR
4. **Schema version**: starsza/nowsza wersja → WARNING

**Fallback:** Jeśli walidacja się nie powiedzie, aplikacja może działać w trybie keyword-only (bez wektorów).

## Generowanie Bundle

### 1. Wygeneruj embeddingi (zewnętrzny pipeline)

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
texts = [record['content'] for record in records]
embeddings = model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)

# Save as float16 to reduce size
np.save('embeddings.f16.npy', embeddings.astype(np.float16))
```

### 2. Wygeneruj keyword_index.json

```bash
python src/search/build_keyword_index.py records_meta.jsonl keyword_index.json
```

### 3. Wygeneruj manifest.json

```python
import json
import numpy as np

manifest = {
    "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "dim": 384,
    "dtype": "float16",
    "count": len(records),
    "schema_version": "v1",
    "records_file": "records_meta.jsonl",
    "embeddings_file": "embeddings.f16.npy",
    "keyword_index_file": "keyword_index.json"
}

with open('manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)
```

## Demo CLI

```bash
python src/search/demo_offline_hybrid.py src/samples/offline_bundle
```

## API (Python)

```python
from src.search.offline_hybrid import load_bundle, search

# Load index (once at startup)
index = load_bundle("path/to/bundle")

# Validate manifest
from src.search.offline_hybrid.load import validate_manifest
errors = validate_manifest(index['manifest'], expected_model="...", expected_dim=384)
if errors:
    print("Bundle validation failed:", errors)
    # Fallback to keyword-only or exit

# Search (q_vec from your embedding model)
results = search(
    index,
    query="plecak ewakuacyjny",
    q_vec=query_embedding,  # np.ndarray (D,), L2-normalized
    lang="pl",              # optional filter
    top_k=10,
    alpha=0.85,             # vector weight
    beta=0.15,              # keyword weight
)

for r in results:
    print(f"{r['score']:.3f} {r['title']}")
    print(f"  Source: {r['doc_title']}, p.{r['page']}")
```

## Privacy

- Brak logowania
- Brak sieci
- Brak zapisu zapytań na dysk

## Kompatybilność Modeli

**Źródło prawdy:**
- Bundle: `manifest.json` → pole `model`
- Runtime: `src/features/search/config.ts` → stała `EMBEDDING_MODEL_ID`

**Zasady:**
- Bundle MUSI być wygenerowany tym samym modelem co używany w runtime
- Aplikacja blokuje wyszukiwanie jeśli `manifest.model != EMBEDDING_MODEL_ID`
- Użytkownik otrzymuje komunikat: "Niezgodny model embeddingów. Zainstaluj zgodną paczkę danych."
