"""
Shared helpers for WWW tier-(i) case-card extraction (deterministic only).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Iterable

SEC_UA = (
    "DCIM-ComplianceDashboard/1.0 "
    "(https://github.com/dannybuk-byte/DCIM; labor-infrastructure-research)"
)

DEFAULT_SEC_PROXY = os.environ.get(
    "WWW_SEC_PROXY_BASE", "https://dcim-api-worker.dannybuk.workers.dev"
).rstrip("/")

PARSING_CONFIDENCE = ("clean", "heuristic", "approximate", "failed")


def pad_cik10(cik: str) -> str:
    d = re.sub(r"\D", "", str(cik))
    if not d:
        return ""
    return d.zfill(10)


def cik_archive_int(cik10: str) -> str:
    return str(int(pad_cik10(cik10)))


def accession_no_dashes(accession: str) -> str:
    return re.sub(r"\D", "", accession)


@dataclass
class SecClient:
    proxy_base: str = DEFAULT_SEC_PROXY
    min_interval_sec: float = 0.12
    _last_fetch: float = field(default=0.0, repr=False)

    def _throttle(self) -> None:
        now = time.monotonic()
        wait = self.min_interval_sec - (now - self._last_fetch)
        if wait > 0:
            time.sleep(wait)
        self._last_fetch = time.monotonic()

    def get_json(self, sec_path: str) -> dict[str, Any]:
        """GET data.sec.gov path after host, e.g. submissions/CIK0001018724.json"""
        self._throttle()
        sec_path = sec_path.lstrip("/")
        url = f"{self.proxy_base}/api/sec/{sec_path}"
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": SEC_UA},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
        data = json.loads(raw.decode("utf-8"))
        if isinstance(data, dict) and data.get("_sec_proxy_non_json"):
            raise RuntimeError(f"SEC proxy returned non-JSON for {url}: {data.get('content_type')}")
        return data

    def get_files_json(self, files_path: str) -> dict[str, Any]:
        """GET www.sec.gov/files/... via worker /api/sec/files/... (JSON or proxy-wrapped errors)."""
        self._throttle()
        files_path = files_path.lstrip("/")
        url = f"{self.proxy_base}/api/sec/files/{files_path}"
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": SEC_UA},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
        data = json.loads(raw.decode("utf-8"))
        if isinstance(data, dict) and data.get("_sec_proxy_non_json"):
            raise RuntimeError(f"SEC proxy returned non-JSON for {url}: {data.get('content_type')}")
        return data

    def get_archives_text(self, archives_path: str) -> str:
        """GET www.sec.gov/Archives/edgar/... via worker /api/sec/archives/..."""
        self._throttle()
        archives_path = archives_path.lstrip("/")
        if archives_path.startswith("Archives/edgar/"):
            archives_path = archives_path[len("Archives/edgar/") :]
        url = f"{self.proxy_base}/api/sec/archives/{archives_path}"
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": SEC_UA,
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.read().decode("utf-8", errors="replace")


def fetch_company_tickers_json(client: SecClient, cache_path: str | None) -> dict[str, Any]:
    if cache_path and os.path.isfile(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            return json.load(f)
    data = client.get_files_json("company_tickers.json")
    if cache_path:
        os.makedirs(os.path.dirname(cache_path) or ".", exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=0)
    return data


def normalize_employer(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^\w\s&]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def tokenize_words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?", text.lower())


def split_paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n\s*\n+", text)
    out = []
    for p in parts:
        t = re.sub(r"[ \t\r\f\v]+", " ", p).strip()
        if len(t) >= 40:
            out.append(t)
    if not out and text.strip():
        return [re.sub(r"\s+", " ", text.strip())]
    return out


def char_offset_to_token_index(text: str, char_offset: int) -> int:
    if char_offset <= 0:
        return 0
    prefix = text[:char_offset]
    return len(tokenize_words(prefix))


def phrase_token_span(text: str, match: re.Match[str]) -> tuple[int, int]:
    """Inclusive token start/end for regex match in text."""
    start = char_offset_to_token_index(text, match.start())
    end_tok = char_offset_to_token_index(text, match.end()) - 1
    return start, max(start, end_tok)


def iter_regex_spans(text: str, pattern: re.Pattern[str]) -> Iterable[tuple[int, int, str]]:
    for m in pattern.finditer(text):
        yield (*phrase_token_span(text, m), m.group(0))


def min_token_distance_between_sets(
    spans_a: list[tuple[int, int]],
    spans_b: list[tuple[int, int]],
) -> int | None:
    if not spans_a or not spans_b:
        return None
    best = 10**9
    for a0, a1 in spans_a:
        for b0, b1 in spans_b:
            if a1 < b0:
                d = max(0, b0 - a1 - 1)
            elif b1 < a0:
                d = max(0, a0 - b1 - 1)
            else:
                d = 0
            if d < best:
                best = d
    return best


NO_WORKFORCE_SENTINEL = 10**6
