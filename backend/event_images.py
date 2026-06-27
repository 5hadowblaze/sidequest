from __future__ import annotations

import json
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parent / "shared" / "demo-event-images.json"
_DATA = json.loads(_DATA_PATH.read_text(encoding="utf-8"))

_BY_TITLE: dict[str, str] = _DATA["by_title"]
_BY_CATEGORY: dict[str, str] = _DATA["by_category"]
_DEFAULT: str = _DATA["default"]


def image_for_event(title: str, category: str) -> str:
    if title in _BY_TITLE:
        return _BY_TITLE[title]
    if category in _BY_CATEGORY:
        return _BY_CATEGORY[category]
    return _DEFAULT
