"""
Shared helpers for WWW tier-(i) case-card extraction (deterministic only).
"""

from __future__ import annotations

import errno
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Iterable

try:
    from ssl import SSLCertVerificationError, SSLError
except ImportError:  # pragma: no cover
    SSLCertVerificationError = SSLError = OSError  # type: ignore[misc, assignment]

SEC_UA = "Dan Buk <dannybuk@gmail.com>"

DEFAULT_SEC_BASE = os.environ.get(
    "WWW_SEC_PROXY_BASE", "https://www.sec.gov"
).rstrip("/")

# Company submissions JSON is served on data.sec.gov (not www); see
# https://www.sec.gov/os/accessing-edgar-data ("RESTful APIs on data.sec.gov").
_SEC_DATA_SUBMISSIONS_BASE = "https://data.sec.gov"

# Module-level spacing between SEC HTTP requests (fair access; default < 10 req/s ceiling).
_SEC_LAST_REQUEST_MONO: float = 0.0
_SEC_MIN_INTERVAL_SEC = 1.1


def _throttle_sec_request() -> None:
    global _SEC_LAST_REQUEST_MONO
    now = time.monotonic()
    wait = _SEC_MIN_INTERVAL_SEC - (now - _SEC_LAST_REQUEST_MONO)
    if wait > 0:
        time.sleep(wait)


def _mark_sec_request_done() -> None:
    global _SEC_LAST_REQUEST_MONO
    _SEC_LAST_REQUEST_MONO = time.monotonic()

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


def _transient_request_failure(exc: BaseException) -> bool:
    if isinstance(exc, urllib.error.HTTPError):
        return 500 <= int(exc.code) < 600
    if isinstance(exc, urllib.error.URLError):
        reason = exc.reason
        if isinstance(reason, (TimeoutError, OSError, SSLError, SSLCertVerificationError)):
            return True
    if isinstance(exc, (TimeoutError, BrokenPipeError, ConnectionResetError, ConnectionAbortedError)):
        return True
    if isinstance(exc, OSError):
        err = getattr(exc, "errno", None)
        if err is not None and err in {errno.EAI_AGAIN, errno.ECONNRESET, errno.ETIMEDOUT, errno.EPIPE}:
            return True
    return False


@dataclass
class SecClient:
    proxy_base: str = DEFAULT_SEC_BASE

    def _urlopen_read(self, req: urllib.request.Request, timeout: float) -> bytes:
        """GET with up to 3 exponential-backoff retries on transient errors (not 403)."""
        last_exc: BaseException | None = None
        for attempt in range(4):
            if attempt > 0:
                delay = min(8.0, 0.5 * (2 ** (attempt - 1)))
                time.sleep(delay)
            _throttle_sec_request()
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    data = resp.read()
                    _mark_sec_request_done()
                    return data
            except urllib.error.HTTPError as e:
                _mark_sec_request_done()
                if int(e.code) == 403:
                    raise
                if _transient_request_failure(e) and attempt < 3:
                    last_exc = e
                    continue
                raise
            except Exception as e:
                _mark_sec_request_done()
                if _transient_request_failure(e) and attempt < 3:
                    last_exc = e
                    continue
                raise
        assert last_exc is not None
        raise last_exc

    def get_json(self, sec_path: str) -> dict[str, Any]:
        """GET data.sec.gov path after host, e.g. submissions/CIK0001018724.json"""
        sec_path = sec_path.lstrip("/")
        url = f"{_SEC_DATA_SUBMISSIONS_BASE}/{sec_path}"
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": SEC_UA},
            method="GET",
        )
        raw = self._urlopen_read(req, 120.0)
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as e:
            raise RuntimeError(f"SEC returned invalid JSON for {url}: {e}") from e
        if isinstance(data, dict) and data.get("_sec_proxy_non_json"):
            raise RuntimeError(f"SEC returned non-JSON for {url}: {data.get('content_type')}")
        return data

    def get_files_json(self, files_path: str) -> dict[str, Any]:
        """GET www.sec.gov/files/... JSON."""
        files_path = files_path.lstrip("/")
        url = f"{self.proxy_base}/files/{files_path}"
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": SEC_UA},
            method="GET",
        )
        raw = self._urlopen_read(req, 120.0)
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as e:
            raise RuntimeError(f"SEC returned invalid JSON for {url}: {e}") from e
        if isinstance(data, dict) and data.get("_sec_proxy_non_json"):
            raise RuntimeError(f"SEC returned non-JSON for {url}: {data.get('content_type')}")
        return data

    def get_archives_text(self, archives_path: str) -> str:
        """GET www.sec.gov/Archives/edgar/..."""
        archives_path = archives_path.lstrip("/")
        if archives_path.startswith("Archives/edgar/"):
            archives_path = archives_path[len("Archives/edgar/") :]
        url = f"{self.proxy_base}/Archives/{archives_path}"
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": SEC_UA,
            },
            method="GET",
        )
        raw = self._urlopen_read(req, 180.0)
        return raw.decode("utf-8", errors="replace")


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
