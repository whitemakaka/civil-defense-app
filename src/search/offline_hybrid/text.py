"""
Text normalization for hybrid search.
Handles Polish diacritics removal for keyword matching.
No logging, no network, no disk writes.
"""
import re
from typing import List

# Polish diacritics mapping
_DIACRITICS_MAP = str.maketrans({
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
    'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
    'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
})

_SPLIT_PATTERN = re.compile(r'[^a-zA-Z0-9]+')


def fold(text: str) -> str:
    """
    Fold text: lowercase + remove Polish diacritics + normalize whitespace.
    Used for keyword matching without accents.
    """
    return ' '.join(
        text.lower()
        .translate(_DIACRITICS_MAP)
        .split()
    )


def tokenize(text: str, min_length: int = 3) -> List[str]:
    """
    Tokenize folded text into keywords.
    Filters out tokens shorter than min_length.
    """
    tokens = _SPLIT_PATTERN.split(text)
    return [t for t in tokens if len(t) >= min_length]


def normalize_query(query: str, min_token_length: int = 3) -> List[str]:
    """Normalize and tokenize query for keyword search."""
    folded = fold(query)
    return tokenize(folded, min_token_length)

