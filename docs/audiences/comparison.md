# Data Center Docket: what other tools do, and what we need to prove

**Daniel Buk · 29 September 2026 · comparison and pilot questions**

![Visual comparison of Docket's proposed public evidence outputs with documented tracker, OSINT, policy, asset, and facility monitoring products](./comparison-matrix.svg)

**How to read the chart:** an outlined ring means a Docket output we propose to test; a filled dot means another product documents that output. Gold marks network or infrastructure clues that can lead to a check, but cannot confirm a facility. Empty cells were not evaluated. Internal assets and live facility readings require operator access. [Check the provider sources](#documented-product-outputs).

> [Interactive comparison](https://dannybuk-byte.github.io/DCIM/comparison.html) · [Audience invitations](./README.md) · [Issue-specific pitches](./issue-bridges.md) · [Public signal atlas](./public-signal-atlas.md)

A council staffer hears about a proposed data center. The power filing, permit and tax deal may be public, yet live in different portals under different names. **Docket is being built to connect the original acts to one site and phase, show conflicts, and prepare a brief that a council staffer, worker group or reporter can check.** Public BGP, DNS, certificate, RDAP and peering data can suggest a lead; they cannot replace two independent official acts for a facility claim. At the reviewed checkpoint, the facility corpus had zero corroborated rows, with no production automated memo pipeline or measured cost/speed advantage. See [`STATUS.md`](../../STATUS.md) and [`AGENTS.md`](../../AGENTS.md).

## One reviewed case, eight possible uses

A site map, a hearing timeline and a worker brief can ask different questions of the same case. These are formats to pilot, not eight finished products. Original agency records may be free to read. Reuse rights, computing, upkeep, human review and corrections still have costs.

| The reader’s question and proposed format | Existing examples | Public material to check |
|---|---|---|
| Where is the site, and what is proposed? **Site profile & map** | Compute Atlas · datacenter.fyi · Civitar | Original parcel and permit records with source links. Proposed Docket format. |
| What changed, and when? **Official-act timeline** | GridTracker · Civitar · agency portals | Dated IDA, DEC, municipal and power acts. Proposed Docket format. |
| What should we read today? **Change digest & alert** | GridTracker · Cleanview · Civitar | Versioned public notices and reviewer queue. Proposed Docket format. |
| Which documents support or challenge the claim? **Evidence packet** | DocumentCloud · Aleph · public trackers | Originals, page/field locations, institutional origin and dispute. Proposed Docket format. |
| What can a council member act on? **Policy memo** | FiscalNote · Quorum · Palantir | Reviewed case, audience question and human sign-off. Proposed Docket format. |
| What is promised to residents and workers? **Community & worker brief** | Civitar · FracTracker · AI GridWatch | Public benefits, jobs, conditions and gaps. Proposed Docket format. |
| What can a public buyer ask for? **Procurement checklist** | Public procurement records · agency clause libraries | Public clauses and disclosed obligations only; no private test data. Proposed Docket format. |
| Can another team check the work? **Case export** | Compute Atlas · GridTracker · DocumentCloud | Rights-reviewed sources and provenance fields. Proposed Docket format. |

**Status:** eight formats to test; zero automated Docket output pipelines validated in production; zero fair cost or speed comparisons completed.

## Which tool would you use for this question?

| Job | Products already doing it | Where Docket would fit |
|---|---|---|
| National facility/market inventory and forecasts | GridTracker, DC Byte, datacenterHawk, Cleanview | Use these for market coverage. Docket would examine a bounded New York public case. |
| Facility maps, timelines, briefs and alerts | Compute Atlas, datacenter.fyi, Civitar, FracTracker, GridTracker, AI GridWatch | Start with their map or brief. Test whether checking original acts, site/phase and conflicts changes the decision. |
| Passive network OSINT and entity links | RIPE/RouteViews, Aleph, SpiderFoot, Maltego | BGP, DNS and related clues point to the next check. They cannot confirm a facility. No person profiling or unauthorized packet access. |
| Asset inventory and IPAM | NetBox, Device42, Oomnitza, Sunbird dcTrack | Use these inside a facility. Any future Docket link needs operator authorization. |
| Live rack power/cooling, alarms and incidents | Sunbird Power IQ, Schneider, Nlyte, Vertiv, Hyperview, openDCIM | Use these for operations. Public permits and network clues cannot reveal live racks; a future link would need authorized equipment data. |
| Document OCR, annotation and retrieval | DocumentCloud, Aleph, Foundry | Use these to work with source documents. Docket could receive or export a reviewed packet. |
| Automated policy memos and reports | FiscalNote, Quorum, Foundry, Civitar, AI GridWatch | Brief writing already exists. Test Docket on original acts, contrary evidence and an answer the intended reader can use. |
| Independent-official-act publication gate | Configurable workbenches and trackers vary | Proposed rule: two independent official acts for the same claim, site and phase, with a visible reason to withhold. Test duplicates and negative cases. |

## Documented product outputs

The links below lead to provider or official product pages. We summarize what those pages document; we have not tested product quality. A feature missing from marketing may still be possible in a configurable tool.

### Public trackers

| Product | Documented output | Input / access boundary |
|---|---|---|
| [GridTracker / interconnection.fyi](https://www.gridtracker.io/) | Queues, project documents, alerts, cited answers and purchased reports | Public and licensed compiled records. Free queue explorer; full platform subscription; a 2026 Half-Year Report is listed at $995. GridTracker already connects permits, queue history and regulatory filings in cited site-specific briefs. Test whether Docket’s claim rule, review gate and worker/community question change one New York decision. |
| [datacenter.fyi](https://www.datacenter.fyi/) | Facility maps, building/air permits, operator and site profiles | Compiled public/project records. Public map; full dataset/API terms to verify. Use the map to find a lead; check the original agency act and its institutional origin before making the facility claim. |
| [Compute Atlas](https://www.compute-atlas.com/about) | Cited facility data, map, API, versioned downloads | Open contributor and sourced records. Public data/API under stated terms. Use its cited map and export; test whether Docket’s official-act gate changes a particular claim. |
| [Civitar](https://civitar.org/) | Cited site briefs, history and site comparisons | Compiled public facility sources. Free cited Site Briefings, timeline and comparisons; Monitor has a launch offer and advertised paid plans. Compare two briefs for the same site and cutoff. Its advertised fast briefing makes speed a question to measure. |
| [Cleanview](https://cleanview.co/data-centers) | Operating/planned project tracker, maps and analysis | Compiled project and energy records. Free public tracker; [commercial platform and report prices](https://cleanview.co/pricing) are posted. Use its project context; trace a local decision through the original filings and contrary records. |
| [FracTracker](https://fractracker.org/data-centers/) | Community/environmental facility map, source links and layers | Curated public records and mapped context. Public access; noncommercial reuse restrictions. Use its community layers as context. Check reuse terms before carrying data into a Docket case. |
| [Epoch AI](https://epoch.ai/data/ai-data-centers) | AI data center timelines, capacity estimates and imagery analysis | Research, imagery and modeled inputs. Public research; some underlying inputs proprietary. Use its scale estimates for context; check the actual agency decision before stating what a site has permission to do. |
| [PNNL IM3 Atlas](https://im3.pnnl.gov/datacenter-atlas) | Facility and infrastructure spatial research layers | Research datasets and modeled scenarios. Public research. Use the spatial research to frame a question; check a current permit for the specific site and phase. |
| [AI GridWatch](https://aigridwatch.com/) | Source-linked project, hearing and moratorium datasets; free action packs and PDFs | Compiled public and secondary sources. Free public hearing toolkit; verify each dataset’s reuse terms before importing it. Use its hearing and policy leads; trace the claim to the agency that made the decision. |
| [Prince William County official map](https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Build_Out_Analysis/MapServer/9) | County building and campus map | Jurisdiction-specific public records. Public views; local terms vary. Use the county map as one local source. A second layer from the same agency is not a second independent act. |

### Market & permits

| Product | Documented output | Input / access boundary |
|---|---|---|
| [DC Byte](https://www.dcbyte.com/us/analytics/) | Facility inventory, capacity, vacancy, market analysis and pull reports | Commercial curation and market inputs. Limited free map; premium quote. Use this for market forecasts and transactions. Docket would answer a narrower public-record question. |
| [datacenterHawk / S&P](https://www.datacenterhawk.com/) | Commercial facility, power, fiber and forecast intelligence | Licensed market data. Quote. Use this for market and transaction intelligence. Docket would focus on a source-linked local case. |
| [Cleanview platform](https://cleanview.co/) | Project pipeline and energy market analytics | Compiled data and analyst work. [Posted commercial prices](https://cleanview.co/pricing). Compare one narrowly scoped public brief with a matched output; no cost or coverage advantage is established. |
| [Shovels](https://www.shovels.ai/blog/decisions-api-launch/) | Normalized permits, properties and local agenda decisions | Multi-jurisdiction permit and meeting ingestion. Trial and paid products; current quote varies. Use the feed to find a decision, then check the underlying agency record before briefing someone. |
| [Accela / OpenGov](https://www.accela.com/solutions/permitting/) | Agency permit, licensing and case workflows | Internal government records and staff actions. Agency procurement. Use these to run agency workflows. Docket could read their public decisions, with authority and terms checked. |
| [NY DEC / DPS / IDA portals](https://dec.ny.gov/news/environmental-notice-bulletin) | Original environmental, power and public-benefit acts | Agency-authored filings and records. Public read often no charge. Read these original acts first. Docket would connect the same site and phase across portals for a reviewed brief. |

### DCAM & inventory

| Product | Documented output | Input / access boundary |
|---|---|---|
| [NetBox Community](https://netboxlabs.com/docs/netbox/) | IPAM, racks, cables, devices and network source of truth | Operator-maintained asset records. Apache-2.0 code; hosting and upkeep remain. An operator could authorize an inventory export for a separate stewardship use; public facility detection cannot infer it. |
| [Device42](https://docs.device42.com/what-is-device42/) | Auto-discovery, dependency map, rack and asset reporting | Authorized SNMP/WMI/SSH and customer-exported NetFlow. Annual device subscription. Its authorized device and flow data answer an operator’s question that BGP and RDAP cannot answer. |
| [Oomnitza](https://www.oomnitza.com/platform-overview/) | Enterprise asset reconciliation, workflow and audit reports | Internal IT/HR/security/finance integrations. Quote. Use it for an organization’s asset lifecycle. Docket’s proposed public case answers a different question. |
| [Ralph / Snipe-IT](https://ralph.allegro.tech/) | Hardware/asset inventory and lifecycle records | Operator-entered internal inventory. Open-source code; operation costs. These inventories could inform an authorized stewardship workflow; they are not public Docket inputs. |

### DCIM operations

| Product | Documented output | Input / access boundary |
|---|---|---|
| [Sunbird dcTrack / Power IQ](https://www.sunbirddcim.com/pricing) | Rack capacity, change, power and environment dashboards/reports | Operator inventory, PDU/sensor data. Cabinet/node licensing; public pricing page. Docket could trace a public energy commitment. It cannot measure a rack or cabinet without operator data. |
| [Schneider EcoStruxure IT Expert](https://www.se.com/us/en/product-range/65972-ecostruxure-it-expert/) | Connected monitoring, alerts and asset views | Connected equipment and authorized operator data. Subscription by node/term; quote/sku. Live alarms need connected equipment; public OSINT does not supply that view. |
| [Nlyte](https://www.nlyte.com/solutions/data-center-infrastructure-management-dcim/) | Asset, capacity, energy, workflow and operational reports | Operator facility and inventory systems. Tailored quote. Docket could trace a public energy promise to filings; Nlyte’s live operations use different inputs. |
| [Vertiv Environet](https://www.vertiv.com/en-us/products-catalog/monitoring-control-and-management/software/vertiv-environet2/) | Facility trends, alerts and power/cooling reports | Onsite devices and sensors. Quote. An authorized stewardship review could cite its trend; public records cannot recreate a sensor reading. |
| [Hyperview](https://hyperviewhq.com/pricing/) | Auto-discovery, 2D/3D, monitoring and report add-ons | Connected devices and operator inventory. Public per-asset pricing; 500-asset minimum. Its live asset monitoring is a different task. A Docket public brief cannot be priced as a substitute. |
| [openDCIM](https://opendcim.org/features.html) | Rack, power, space, temperature and outage reports | Operator-maintained onsite inventory. GPL code; deployment/maintenance costs. Open-source facility management already exists. Docket’s proposed job is a public-record case. |
| [FNT Command / Cormant](https://www.fntsoftware.com/en/products/fnt-command/for-data-centers) | Cabling, capacity, assets, 2D/3D and operational views | Operator infrastructure model. Quote. Cabling and equipment views require operator access, including any future AR display. |

### Documents & policy

| Product | Documented output | Input / access boundary |
|---|---|---|
| [DocumentCloud / MuckRock](https://www.documentcloud.org/) | OCR, annotation, publication, document packets and records requests | User-held documents and public records. Free for eligible uses; premium services/credits. Export a reviewed source packet into DocumentCloud; there is no need to claim Docket invented OCR. |
| [OCCRP Aleph](https://docs.aleph.occrp.org/) | Search, OCR, entities, graphs and timelines | Investigative documents and datasets. Open-source platform; hosting costs. Use its document search and graph. Docket would apply a narrower rule to a facility claim. |
| [FiscalNote PolicyNote](https://fiscalnote.com/products/policynote) | Policy tracking, AI fact sheets, reports and briefs | Licensed policy corpus and user workflow. Request pricing. It already generates policy material. Compare whether Docket’s site, phase and original-act trail improves one brief. |
| [Quorum / Quincy](https://www.quorum.us/products/quincy-ai/) | Bill tracking, meeting briefs, AI summaries and impact reports | Policy/advocacy data and staff workflow. Request pricing. It already prepares policy briefs. Put one New York data-center case through both workflows. |
| [Palantir Foundry Notepad](https://www.palantir.com/docs/foundry/analytics/reporting/) | Integrated analytics, templated documents and PDF reports | Configured enterprise ontology and authorized data. Enterprise quote. A configured enterprise platform can do far more. Test Docket on the bounded public-record case. |
| [Maltego / SpiderFoot](https://www.maltego.com/pricing/) | Link analysis, OSINT correlation and exports | Public, internal or commercial transforms; scans can be active. Free tiers/open code plus paid plans. Use permitted corporate and infrastructure leads only; exclude person-level profiling and unauthorized scans. |

## Would this save time or money on the same brief?

- **Start with the real baseline.** One bounded public case may use original records without a national-data license. That does not make the work free. Compare with the agency portals and free offerings from [Civitar](https://civitar.org/) and [Compute Atlas](https://www.compute-atlas.com/about). [NetBox Community](https://netboxlabs.com/docs/netbox/) and [openDCIM](https://opendcim.org/features.html) are open-source tools for different, operator-side jobs.
- **Match the job.** Sunbird, Schneider, Nlyte, Vertiv, Hyperview and openDCIM use operator data for live assets, sensors and incidents. BGP and permits cannot supply those readings. Compare a public brief with another way of producing a public brief.
- **Run a fair pilot.** Choose ten representative sites, the same source cutoff and output standard. Start the clock when the original record posts; stop when the reviewer accepts a correct brief. Count missed acts, false site matches, duplicate origins, bad citations, contrary evidence and repair time. Ask the intended reader whether the result helps them act.
- **Price the whole workflow.** Include source rights, hosting, OCR/model use, maintenance, analyst and reviewer time, and corrections. Do the same for manual portals, free tools and any paid option under its actual terms. Enter measured inputs in the [interactive worksheet](https://dannybuk-byte.github.io/DCIM/comparison.html#cost).

**What we can say now:** Docket is designed to turn one versioned public case into briefs for different readers, with a possible low source-license cost for a bounded case. We have not established a free total product, a discount, faster delivery, national coverage or parity with operator-side DCIM/DCAM.

The interactive page also lists products explored earlier. We do not make current pricing or feature claims for them without a primary-source check.
