# Data Center Docket: competitive output comparison

**Daniel Buk · 29 September 2026 · research and proposed product comparison**

![Visual comparison of Docket's proposed public evidence outputs with documented tracker, OSINT, policy, asset, and facility monitoring products](./comparison-matrix.svg)

**Read it at a glance:** outlined rings are the proposed Docket workflow; filled dots are outputs documented by existing products. The small gold dot marks support-only network and infrastructure leads. Empty cells mean the feature was not evaluated for this chart. The rightmost columns require operator data. [See the provider sources below](#documented-product-outputs).

> [Interactive comparison](https://dannybuk-byte.github.io/DCIM/comparison.html) · [Audience invitations](./README.md) · [Issue-specific pitches](./issue-bridges.md) · [Public signal atlas](./public-signal-atlas.md)

Data Center Docket proposes an open-source, public-record and outside-the-fence OSINT workflow that connects official acts to a site, phase, institutional origin and reviewed audience memo. It has **not** demonstrated a production automated memo pipeline or a measured price/speed advantage. The reviewed Phase-1 facility corpus had zero corroborated rows. Public BGP, DNS, CT, RDAP and peering are support-only and cannot substitute for two eligible independent official acts in a facility confirmation. See [`STATUS.md`](../../STATUS.md) and [`AGENTS.md`](../../AGENTS.md).

## Eight output formats with a possible low-license pathway

These are **candidate overlaps**, not eight shipped product equivalents. Each may be drafted from eligible public records without buying a commercial facility database for one bounded case. Public visibility does not itself grant commercial reuse; hosting, OCR/LLM, source upkeep, analyst review and correction cost remain.

| Output format | Existing examples | Docket status |
|---|---|---|
| Site profile & map | Compute Atlas · datacenter.fyi · Civitar | Candidate Docket output; sources: Public parcel, permit and source links. |
| Official-act timeline | GridTracker · Civitar · agency portals | Candidate Docket output; sources: Dated IDA, DEC, municipal and power acts. |
| Change digest & alert | GridTracker · Cleanview · Civitar | Candidate Docket output; sources: Versioned public notices and reviewer queue. |
| Citation / contrary-evidence packet | DocumentCloud · Aleph · public trackers | Candidate Docket output; sources: Original documents, page/field locator, origin and dispute. |
| Policy / legislative memo | FiscalNote · Quorum · Palantir | Candidate Docket output; sources: Reviewed case + audience question + human sign-off. |
| Community & worker brief | Civitar · FracTracker · AI GridWatch | Candidate Docket output; sources: Public benefits, jobs, conditions and unknowns. |
| Procurement / assurance checklist | AI GridWatch action pack · policy tools · public records | Candidate Docket output; private tests excluded; sources: Public clause and disclosed obligation only. |
| Structured case export | Compute Atlas · GridTracker · DocumentCloud | Candidate Docket output; sources: Rights-reviewed source and provenance fields. |

**Count:** 8 candidate public-output formats; **0** production-validated automated Docket output pipelines at the reviewed checkpoint; **0** matched-scope benchmarks proving a discount or faster reviewed delivery.

## Capability chart

| Job | Products already doing it | Docket relationship |
|---|---|---|
| National facility/market inventory and forecasts | GridTracker, DC Byte, datacenterHawk, Cleanview | Different scope: bounded public evidence, not proprietary market coverage. |
| Facility maps, timelines, briefs and alerts | Compute Atlas, datacenter.fyi, Civitar, FracTracker, GridTracker, AI GridWatch | Proposed overlap; test site/phase/origin accuracy, counterevidence and user value. |
| Passive network OSINT and entity links | RIPE/RouteViews, Aleph, SpiderFoot, Maltego | Support-only leads under Docket method; no person profiling, remote packet access or facility confirmation. |
| Asset inventory and IPAM | NetBox, Device42, Oomnitza, Sunbird dcTrack | Operator-maintained internal data; possible future authorized input, not public OSINT parity. |
| Live rack power/cooling, alarms and incidents | Sunbird Power IQ, Schneider, Nlyte, Vertiv, Hyperview, openDCIM | Outside Public Docket. Any stewardship link needs a separate authorized vantage and controls. |
| Document OCR, annotation and retrieval | DocumentCloud, Aleph, Foundry | Complement; export a reviewed source packet rather than rebuild a general workbench. |
| Automated policy memos and reports | FiscalNote, Quorum, Foundry, Civitar, AI GridWatch | Already available elsewhere. Docket proposes narrower data-center claim gating and audience-specific provenance. |
| Independent-official-act publication gate | Configurable workbenches and trackers vary | Explicit Docket design; needs held-out live-case and duplicate-origin tests. |

## Documented product outputs

Each link is to a provider or official product source. These descriptions are product claims or published documentation, not independently tested performance. A missing feature in public marketing is not proof that a configurable tool cannot perform it.

### Public trackers

| Product | Documented output | Input / access boundary |
|---|---|---|
| [GridTracker / interconnection.fyi](https://www.gridtracker.io/) | Queues, project documents, alerts, cited answers and purchased reports | Public and licensed compiled records. Public queue explorer; platform and $995 report are paid. A Docket case could reuse original public acts for a narrower civic decision, not match national coverage. |
| [datacenter.fyi](https://www.datacenter.fyi/) | Facility maps, building/air permits, operator and site profiles | Compiled public/project records. Public map; full dataset/API terms to verify. Candidate lookup; exact original act and origin review would be a separate Docket step. |
| [Compute Atlas](https://www.compute-atlas.com/about) | Cited facility data, map, API, versioned downloads | Open contributor and sourced records. Public data/API under stated terms. Comparable map/export; Docket proposes claim-specific official-act gates. |
| [Civitar](https://civitar.org/) | Cited site briefs, history and site comparisons | Compiled public facility sources. Free brief plan; paid monitoring tiers advertised. Direct brief competitor; no speed win is claimed against its ~1-minute brief. |
| [Cleanview](https://cleanview.co/data-centers) | Operating/planned project tracker, maps and analysis | Compiled project and energy records. Free tracker; platform/report terms vary. Candidate and market context; Docket target is decision-specific source review. |
| [FracTracker](https://fractracker.org/data-centers/) | Community/environmental facility map, source links and layers | Curated public records and mapped context. Public access; noncommercial reuse restrictions. Community context and leads; Docket cannot bulk republish without rights. |
| [Epoch AI](https://epoch.ai/data/ai-data-centers) | AI data center timelines, capacity estimates and imagery analysis | Research, imagery and modeled inputs. Public research; some underlying inputs proprietary. Scale context; estimates cannot substitute for exact official acts. |
| [PNNL IM3 Atlas](https://im3.pnnl.gov/datacenter-atlas) | Facility and infrastructure spatial research layers | Research datasets and modeled scenarios. Public research. Spatial context, not a substitute for a current site/phase permit claim. |
| [AI GridWatch](https://aigridwatch.com/) | Source-linked project, hearing and moratorium datasets; free action packs and PDFs | Compiled public and secondary sources. Public downloads under stated license. Discovery and policy context; trace each finding back to original institutional act. |
| [Prince William County official map](https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Build_Out_Analysis/MapServer/9) | County building and campus map | Jurisdiction-specific public records. Public views; local terms vary. Official local act can be source; one publishing agency remains one origin. |

### Market & permits

| Product | Documented output | Input / access boundary |
|---|---|---|
| [DC Byte](https://www.dcbyte.com/us/analytics/) | Facility inventory, capacity, vacancy, market analysis and pull reports | Commercial curation and market inputs. Limited free map; premium quote. Docket cannot reproduce proprietary market forecast or deal coverage. |
| [datacenterHawk / S&P](https://www.datacenterhawk.com/) | Commercial facility, power, fiber and forecast intelligence | Licensed market data. Quote. Market and transaction decisions remain a different product. |
| [Cleanview platform](https://cleanview.co/) | Project pipeline and energy market analytics | Compiled data and analyst work. Quote / access terms vary. Public evidence memo may cost less in cash for a narrow case, but is not equivalent coverage. |
| [Shovels](https://www.shovels.ai/blog/decisions-api-launch/) | Normalized permits, properties and local agenda decisions | Multi-jurisdiction permit and meeting ingestion. Trial and paid products; current quote varies. Useful discovery feed; Docket would verify the underlying agency record. |
| [Accela / OpenGov](https://www.accela.com/solutions/permitting/) | Agency permit, licensing and case workflows | Internal government records and staff actions. Agency procurement. Docket reads authorized public outputs; does not run a permitting department. |
| [NY DEC / DPS / IDA portals](https://dec.ny.gov/news/environmental-notice-bulletin) | Original environmental, power and public-benefit acts | Agency-authored filings and records. Public read often no charge. Authoritative primary source; Docket proposes cross-portal identity and memo layer. |

### DCAM & inventory

| Product | Documented output | Input / access boundary |
|---|---|---|
| [NetBox Community](https://netboxlabs.com/docs/netbox/) | IPAM, racks, cables, devices and network source of truth | Operator-maintained asset records. Apache-2.0 code; hosting and upkeep remain. Useful future authorized export, not a public facility-detection substitute. |
| [Device42](https://docs.device42.com/what-is-device42/) | Auto-discovery, dependency map, rack and asset reporting | Authorized SNMP/WMI/SSH and customer-exported NetFlow. Annual device subscription. Internal asset and flow detail cannot be inferred from BGP or RDAP. |
| [Oomnitza](https://www.oomnitza.com/platform-overview/) | Enterprise asset reconciliation, workflow and audit reports | Internal IT/HR/security/finance integrations. Quote. Lifecycle/chain-of-custody job differs from public project case. |
| [Ralph / Snipe-IT](https://ralph.allegro.tech/) | Hardware/asset inventory and lifecycle records | Operator-entered internal inventory. Open-source code; operation costs. Potential authorized stewardship components, not Docket public data. |

### DCIM operations

| Product | Documented output | Input / access boundary |
|---|---|---|
| [Sunbird dcTrack / Power IQ](https://www.sunbirddcim.com/pricing) | Rack capacity, change, power and environment dashboards/reports | Operator inventory, PDU/sensor data. Cabinet/node licensing; public pricing page. Docket can draft a public commitment brief, not measure a cabinet. |
| [Schneider EcoStruxure IT](https://www.se.com/us/en/product-range/65972-ecostruxure-it-expert/) | Live alarms, assets, power/cooling and capacity planning | Connected equipment and digital twin. Subscription by node/term; quote/sku. No OSINT equivalent to its live operations view. |
| [Nlyte](https://www.nlyte.com/solutions/data-center-infrastructure-management-dcim/) | Asset, capacity, energy, workflow and operational reports | Operator facility and inventory systems. Tailored quote. Docket could link a public energy promise to records; no operational parity. |
| [Vertiv Environet](https://www.vertiv.com/en-us/products-catalog/monitoring-control-and-management/software/vertiv-environet2/) | Facility trends, alerts and power/cooling reports | Onsite devices and sensors. Quote. Authorized future stewardship could reference a finding, not recreate sensors. |
| [Hyperview](https://hyperviewhq.com/pricing/) | Auto-discovery, 2D/3D, monitoring and report add-ons | Connected devices and operator inventory. Public per-asset pricing; 500-asset minimum. Different measurement and purpose; no valid savings percentage against Docket. |
| [openDCIM](https://opendcim.org/features.html) | Rack, power, space, temperature and outage reports | Operator-maintained onsite inventory. GPL code; deployment/maintenance costs. Free DCIM already exists; Docket is a different public evidence workflow. |
| [FNT Command / Cormant](https://www.fntsoftware.com/en/products/fnt-command/for-data-centers) | Cabling, capacity, assets, 2D/3D and operational views | Operator infrastructure model. Quote. Inside-the-fence detail and AR require operator authority. |

### Documents & policy

| Product | Documented output | Input / access boundary |
|---|---|---|
| [DocumentCloud / MuckRock](https://www.documentcloud.org/) | OCR, annotation, publication, document packets and records requests | User-held documents and public records. Free for eligible uses; premium services/credits. Docket could export a governed case there instead of rebuilding OCR. |
| [OCCRP Aleph](https://docs.aleph.occrp.org/) | Search, OCR, entities, graphs and timelines | Investigative documents and datasets. Open-source platform; hosting costs. Mature configurable workbench; Docket target is bounded facility claim review. |
| [FiscalNote PolicyNote](https://fiscalnote.com/products/policynote) | Policy tracking, AI fact sheets, reports and briefs | Licensed policy corpus and user workflow. Request pricing. Memo automation already exists; Docket specialization is source/site/phase lineage. |
| [Quorum / Quincy](https://www.quorum.us/products/quincy-ai/) | Bill tracking, meeting briefs, AI summaries and impact reports | Policy/advocacy data and staff workflow. Request pricing. No blanket novelty claim for memo writing; compare one NY data-center case. |
| [Palantir Foundry Notepad](https://www.palantir.com/docs/foundry/analytics/reporting/) | Integrated analytics, templated documents and PDF reports | Configured enterprise ontology and authorized data. Enterprise quote. Far broader configurable platform; Docket aims for smaller public-evidence niche. |
| [Maltego / SpiderFoot](https://www.maltego.com/pricing/) | Link analysis, OSINT correlation and exports | Public, internal or commercial transforms; scans can be active. Free tiers/open code plus paid plans. Docket would use only permitted corporate/infrastructure leads, not person profiling. |

## Cost and speed: how to establish the claim

- **Cash pathway:** a small, rights-cleared public-record case can avoid buying a proprietary national dataset. This does not make production, labor or review free. Free alternatives already exist, including [Civitar](https://civitar.org/), [Compute Atlas](https://www.compute-atlas.com/about), [NetBox Community](https://netboxlabs.com/docs/netbox/) and [openDCIM](https://opendcim.org/features.html).
- **No DCIM substitution:** Sunbird, Schneider, Nlyte, Vertiv, Hyperview and openDCIM report on sensors, rack inventory, equipment and incidents that public BGP or permits cannot observe. Compare the public memo task, never a cabinet monitoring quote to a policy brief.
- **Matched pilot:** pin ten representative site cases, the same source cutoff and output standard. Time from original record posting to a *reviewed, correct* memo. Measure missed acts, false site joins, mirror-as-independent errors, locator accuracy, contrary evidence, correction time and user acceptance.
- **Total cost:** public/source licenses + hosted tools + OCR/LLM/API + maintenance + analyst and reviewer hours + rights and error/correction cost. Compare against manual official portals, free trackers, and any licensed product under its actual terms. For a pilot, record the inputs and calculate both totals from this formula. The [interactive worksheet](https://dannybuk-byte.github.io/DCIM/comparison.html#cost) accepts measured inputs without inventing a discount.

**Claim allowed now:** Docket is designed to make multiple public case outputs from a common, versioned evidence layer with potentially low source-license cash cost. **Claims not established:** “free total product,” “X% cheaper,” “Y hours faster,” equivalent national coverage, or parity with inside-the-fence DCIM/DCAM.

Further historically explored products appear in the expandable register at the foot of the interactive chart. Their current pricing and functions are not asserted without a matched primary-source check.
