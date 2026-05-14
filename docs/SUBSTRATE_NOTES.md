# Substrate Notes

Process observations and substrate-level patterns. Not engineering governance (see `docs/AGENT_CHARTER_*`). Not methodology (see `wwwill-methodology-note-*`). Substrate metadata only.

---
## 2026-05-13 — Cross-LLM consultation convergence pattern

Charter v1→v3 evolution used a Claude (drafting) + ChatGPT (pressure-testing) loop. Pattern observations:

- **Three rounds maximum to convergence.** Greenfield artifacts (v1→v3) took three rounds. Refining a working artifact (v3→v4) took one round. The marginal-return curve flattens fast.

- **The second LLM's most productive role is anti-scope-creep adjudication, not novel content generation.** In both consultation cycles, ChatGPT's highest-value contribution was explicitly drawing the stop line — "no further iteration warranted" — rather than introducing new content.

- **Both LLMs must have permission to say "stop."** Without that framing, both default to generating more refinements regardless of marginal value. The stop-permission framing is what made the pattern terminate cleanly.

- **Convergence on narrow scope across both advisors is itself evidence.** When both LLMs independently arrive at the same termination point with similar reasoning, that's a stronger signal than either individual recommendation.

Reusable pattern for future charter-class artifacts: production-run scaling charter, tier-(ii) classifier charter, and others queued in the substrate.

---
## 2026-05-14 — SEC EDGAR rate-limit enforcement against Cloudflare Worker egress IPs

**Observation:** SEC EDGAR rate-limit enforcement against Cloudflare Worker egress IPs extends beyond the documented 10-minute window.

**Evidence:** ~16-hour persistent block following ~5 repeat trips within a one-hour window during May 13 debugging session. Block persisted across overnight despite UA improvements and no further requests during the wait period. Reference ID `0.d30c0317.1778759635.1c3e7f76` from morning May 14 verification curl.

**Mechanism (inferred):** Block sits at the IP layer, not the identity layer. User-Agent improvements do not lift the block when the Cloudflare Worker egress IP itself is on SEC's persistent block list. Documented 10-minute rolling rate-limit applies only to first-trip enforcement; repeated trips trigger longer-tail IP-level blocks of unknown duration.

**Implication for production:** The current proxy architecture is not viable for production-scale WWW pipeline runs without one of:
  (a) dedicated egress IP not shared with general Worker traffic,
  (b) direct-from-localhost SEC fetches with strict client-side throttling (max 10 req/s per SEC guidance, conservative sub-1 req/s recommended),
  (c) commercial SEC data provider (e.g., SEC API providers that maintain their own throttled fetch infrastructure),
  (d) issuer investor-relations sites as a parallel retrieval path for pre-validated issuer lists (caveat: SEC EDGAR remains canonical for discovery and citation; IR sites are retrieval workaround only).

**Status:** Open architectural decision. Not blocking sample-run validation (which can use local cached filings). Blocking production-scale pipeline runs.
