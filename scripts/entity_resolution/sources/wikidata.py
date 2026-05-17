"""
Wikidata SPARQL lookups (live) with fixture-backed tests.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from typing import Any, Optional

from .base import WikidataResult

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIDATA_UA = "DCIM-EntityResolution/1.0 (dannybuk@gmail.com; Block-4.5.0)"


def _sparql(query: str, timeout: float = 60.0) -> dict[str, Any]:
    url = WIKIDATA_SPARQL + "?" + urllib.parse.urlencode({"query": query, "format": "json"})
    req = urllib.request.Request(
        url,
        headers={"User-Agent": WIKIDATA_UA, "Accept": "application/sparql-results+json"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _bindings(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data.get("results", {}).get("bindings", []) or []


def _clean_search_term(name: str) -> str:
    import re

    s = re.sub(r"\([^)]*\)", "", name)
    s = re.sub(r",?\s+(Inc\.?|Corp\.?|Corporation|plc|Co\.?|LLC)\s*$", "", s, flags=re.I)
    return s.strip()


def _wb_search(term: str) -> list[dict[str, str]]:
    params = urllib.parse.urlencode(
        {
            "action": "wbsearchentities",
            "search": term,
            "language": "en",
            "format": "json",
            "limit": "5",
        }
    )
    url = f"https://www.wikidata.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": WIKIDATA_UA}, method="GET")
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    out: list[dict[str, str]] = []
    for row in data.get("search", []) or []:
        qid = str(row.get("id") or "")
        label = str(row.get("label") or "")
        if qid.startswith("Q") and label:
            out.append({"qid": qid, "label": label})
    return out


def live_wikidata_lookup(candidate_name: str, aliases: list[str]) -> WikidataResult:
    labels = [candidate_name, *aliases]
    seen_qids: list[str] = []
    best: Optional[WikidataResult] = None

    search_terms = list(
        dict.fromkeys(
            t
            for t in ([_clean_search_term(candidate_name)] + [_clean_search_term(a) for a in aliases])
            if t.strip()
        )
    )

    qid_by_term: dict[str, str] = {}
    label_by_qid: dict[str, str] = {}

    for term in search_terms:
        try:
            hits = _wb_search(term)
        except Exception:
            continue
        time.sleep(0.35)
        if not hits:
            continue
        top = hits[0]
        qid_by_term[term] = top["qid"]
        label_by_qid[top["qid"]] = top["label"]
        seen_qids.append(top["qid"])

    uniq_qids = list(dict.fromkeys(qid_by_term.values()))
    if len(uniq_qids) > 1:
        return WikidataResult(ambiguous_qids=uniq_qids)

    if uniq_qids:
        qid = uniq_qids[0]
        best = WikidataResult(qid=qid, canonical_legal_name=label_by_qid[qid], aliases=[])

    if best is None:
        return WikidataResult(no_match=True)

    if best.qid:
        sub_q = f"""
SELECT ?sub ?subLabel WHERE {{
  wd:{best.qid} wdt:P355 ?sub .
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT 25
"""
        try:
            sub_data = _sparql(sub_q)
            best.subsidiary_labels = [
                r.get("subLabel", {}).get("value", "")
                for r in _bindings(sub_data)
                if r.get("subLabel", {}).get("value")
            ]
        except Exception:
            pass

        parent_q = f"""
SELECT ?parent ?parentLabel WHERE {{
  wd:{best.qid} wdt:P749 ?parent .
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT 3
"""
        try:
            p_data = _sparql(parent_q)
            best.parent_qids = [
                r.get("parent", {}).get("value", "").rsplit("/", 1)[-1]
                for r in _bindings(p_data)
                if r.get("parent", {}).get("value")
            ]
        except Exception:
            pass

    return best


def wikidata_from_fixture(payload: dict[str, Any]) -> WikidataResult:
    return WikidataResult(
        qid=payload.get("qid"),
        canonical_legal_name=payload.get("canonical_legal_name"),
        aliases=list(payload.get("aliases") or []),
        parent_qids=list(payload.get("parent_qids") or []),
        subsidiary_labels=list(payload.get("subsidiary_labels") or []),
        ambiguous_qids=list(payload.get("ambiguous_qids") or []),
        no_match=bool(payload.get("no_match")),
    )
