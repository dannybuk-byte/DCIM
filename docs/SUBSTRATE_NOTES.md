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

---

## 2026-05-14 — SEC fetch architecture decision: localhost-direct as primary

**Decision:** Localhost-direct fetches from `www.sec.gov`, on-demand runtime (8am-10pm working hours), no VM, no Cloudflare Worker proxy in the request path. Throttled client-side at sub-1 req/s default, hard ceiling at SEC's published 10 req/s.

**Stack ordering considered:** B (localhost-direct) > D (IR-site fallback) > A (dedicated Worker egress IP). B selected as sole primary path; D and A deferred.

**Why B over A:** A doesn't fix the failure mode that took the pipeline offline. The shared Worker IP got blocked because SEC's enforcement caught the request pattern, not because the IP was shared per se. A dedicated Worker IP can land on the same persistent block list on its own merits. B avoids the Worker-egress reputation problem entirely; SEC enforcement against a single residential IP making sub-1 req/s within published guidance is well-precedented to be rare.

**Why on-demand rather than VM-autonomous:** Pipeline cadence is reconciliation work (WARN ↔ SEC contradiction detection), not real-time alerting. Sub-day latency not required. On-demand laptop runs during working hours match actual usage pattern; VM provisioning was deferred as solving a problem we don't have.

**Why D deferred:** With interactive runs, "B failed for issuer X, retry tomorrow or fetch manually" is acceptable human-in-the-loop response. Per-issuer scrapers only justify their maintenance burden once specific issuer-level failures become frequent enough to automate around.

**Why A held in reserve:** Future option if on-demand becomes binding constraint and a leased VM is unacceptable for cost/ops/data-residency reasons not yet surfaced. Two product details still need verification before A is deployable: whether Cloudflare's dedicated-egress-IP product covers Workers specifically, and required plan tier.

**Status:** Decision made; implementation pending under Block 3. Rate-limit numbers (sub-1 req/s default, 10 req/s ceiling) inherited from prior substrate-notes observation and should be re-verified against current SEC EDGAR fair-access policy before Block 3 implementation lands.
