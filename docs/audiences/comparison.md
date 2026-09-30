# Data Center Docket: what other tools do, and what we need to prove

## In one minute

| Read next | Why it matters |
|---|---|
| [Two products](#two-intended-products) | Public case briefs and permissioned operational tests need different inputs. |
| [Eight possible outputs](#one-reviewed-case-eight-possible-uses) | Docket formats are proposed, not shipped. |
| [Job-by-job matrix](#which-tool-would-you-use-for-this-question) | Compare public evidence tools with operator systems on the task they perform. |
| [33 documented products](#documented-product-outputs) | Open each provider page and the claimed output. |
| [Cost and speed test](#would-this-save-time-or-money-on-the-same-brief) | Any discount or speed advantage needs matched work and measured cost. |
| [Annotated bibliography](./sources.md) | See the owner sources, grouped-provider links and claim limits. |


**Daniel Buk · 29 September 2026 · comparison and pilot questions**

![Visual comparison of Docket's proposed public evidence outputs with documented tracker, OSINT, policy, asset, and facility monitoring products](./comparison-matrix.svg)

**How to read the chart:** an outlined ring means a Docket output we propose to test; a filled dot means another product documents that output. Gold marks network or infrastructure clues that can lead to a check, but cannot confirm a facility. Empty cells were not evaluated. Internal assets and live facility readings require operator access. [Check the provider sources](#documented-product-outputs).

> [Interactive comparison](https://dannybuk-byte.github.io/DCIM/comparison.html) · [Audience invitations](./README.md) · [Issue-specific pitches](./issue-bridges.md) · [Public signal atlas](./public-signal-atlas.md)

A council staffer hears about a proposed data center. The power filing, permit and tax deal may be public, yet live in different portals under different names. **Docket is being built to connect the original acts to one site and phase, show conflicts, and prepare a brief that a council staffer, worker group or reporter can check.** Public BGP, DNS, certificate, RDAP and peering data can suggest a lead; they cannot replace two independent official acts for a facility claim. At the reviewed checkpoint, the facility corpus had zero corroborated rows, with no production automated memo pipeline or measured cost/speed advantage. See [`STATUS.md`](../../STATUS.md) and [`AGENTS.md`](../../AGENTS.md).

## Two intended products

| Route | Input and decision | Current boundary |
|---|---|---|
| **Public Docket** | Original public acts become a reviewed site case and a brief for a town, worker group or resident. | First shipping focus; no live official-record-to-interface path or production memo pipeline established. |
| **Traffic and Workload Stewardship Console** | With separate permission, service, task and incident events could support a scoped recovery or useful-work test. | Coequal intention, separately governed; no operator integration or deployed Console established. |

The chart below compares **public case outputs**. DCIM and DCAM tools answer operator questions with operator data. A future authorized Console study could compare a specified task with them; public OSINT and private telemetry do not count toward each other's evidence gates.

## One reviewed case, eight possible uses

A site map, a hearing timeline and a worker brief can ask different questions of the same case. These are formats to pilot, not eight finished products. Original agency records may be free to read. Reuse rights, computing, upkeep, human review and corrections still have costs.

| The reader’s question and proposed format | Existing examples | Public material to check |
|---|---|---|
| Where is the site, and what is proposed? **Site profile & map** | Compute Atlas · datacenter.fyi · Civitar | Original parcel and permit records with source links. Proposed Docket format. |
| What changed, and when? **Official-act timeline** | GridTracker · Civitar · agency portals | Dated IDA, DEC, municipal and power acts. Proposed Docket format. |
| What should we read today? **Change digest & alert** | GridTracker · Cleanview · Civitar | Versioned public notices and reviewer queue. Proposed Docket format. |
| Which documents support or challenge the claim? **Evidence packet** | DocumentCloud · Aleph · public trackers | Originals, page/field locations, institutional origin and dispute. Proposed Docket format. |
| What can a council member act on? **Policy memo** | FiscalNote · Quorum | Reviewed case, audience question and human sign-off. Proposed Docket format. |
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
| Asset inventory and IPAM | NetBox, Device42, Oomnitza, Sunbird dcTrack | Use these inside a facility. A proposed Console export needs operator authorization, access controls and a task-specific purpose. |
| Live rack power/cooling, alarms and incidents | Sunbird Power IQ, Schneider, Nlyte, Vertiv, Hyperview, openDCIM | Use these for operations. Public permits and network clues cannot reveal live racks; A Console study would need authorized equipment data and a defined incident question. |
| Document OCR, annotation and retrieval | DocumentCloud, Aleph, Foundry | Use these to work with source documents. Docket could receive or export a reviewed packet. |
| Policy research, site briefs and enterprise reports | FiscalNote, Quorum, Foundry, Civitar, AI GridWatch | These are different outputs. Test a Docket memo against a matched question, original acts, contrary evidence and the reader’s decision. |
| Independent-official-act publication gate | Configurable workbenches and trackers vary | Proposed rule: two independent official acts for the same claim, site and phase, with a visible reason to withhold. Test duplicates and negative cases. |

## Documented product outputs

The links below lead to provider or official product pages. We summarize what those pages document; we have not tested product quality. A feature missing from marketing may still be possible in a configurable tool.

### Public trackers

| Product | Documented output | Input / access boundary |
|---|---|---|
| <a id="product-01"></a> [GridTracker / interconnection.fyi](https://www.gridtracker.io/) | Queues, project documents, alerts, cited answers and purchased reports | Public and licensed compiled records. Free queue explorer; full platform subscription; current report prices are on the provider page. GridTracker already connects permits, queue history and regulatory filings in cited site-specific briefs. Test whether Docket’s claim rule, review gate and worker/community question change one New York decision. |
| <a id="product-02"></a> [datacenter.fyi](https://www.datacenter.fyi/) | Facility maps, building/air permits, operator and site profiles | Compiled public/project records. Public map; full dataset/API terms to verify. Use the map to find a lead; check the original agency act and its institutional origin before making the facility claim. |
| <a id="product-03"></a> [Compute Atlas](https://www.compute-atlas.com/about) | Cited facility data, map, API, versioned downloads | Open contributor and sourced records. Public data/API under stated terms. Use its cited map and export; test whether Docket’s official-act gate changes a particular claim. |
| <a id="product-04"></a> [Civitar](https://civitar.org/) | Cited site briefs, history and site comparisons | Compiled public facility sources. Public cited Site Briefings, timeline and comparisons; current Monitor and plan terms need a fresh provider check. Compare two briefs for the same site and cutoff. Its advertised fast briefing makes speed a question to measure. |
| <a id="product-05"></a> [Cleanview](https://cleanview.co/data-centers) | Operating/planned project tracker, maps and analysis | Compiled project and energy records. Free public tracker; [commercial platform and report prices](https://cleanview.co/pricing) are posted. Use its project context; trace a local decision through the original filings and contrary records. |
| <a id="product-06"></a> [FracTracker](https://fractracker.org/data-centers/) | Community/environmental facility map, source links and layers | Curated public records and mapped context. Public access; noncommercial reuse restrictions. Use its community layers as context. Check reuse terms before carrying data into a Docket case. |
| <a id="product-07"></a> [Epoch AI](https://epoch.ai/data/ai-data-centers) | AI data center timelines, capacity estimates and imagery analysis | Research, imagery and modeled inputs. Public research; some underlying inputs proprietary. Use its scale estimates for context; check the actual agency decision before stating what a site has permission to do. |
| <a id="product-08"></a> [PNNL IM3 Atlas](https://immm-sfa.github.io/datacenter-atlas/) | Facility and infrastructure spatial research layers | Research datasets and modeled scenarios. Public research. Use the spatial research to frame a question; check a current permit for the specific site and phase. |
| <a id="product-09"></a> [AI GridWatch](https://aigridwatch.com/) | Source-linked project, hearing and moratorium datasets; free action packs and PDFs | Compiled public and secondary sources. Free public hearing toolkit; verify each dataset’s reuse terms before importing it. Use its hearing and policy leads; trace the claim to the agency that made the decision. |
| <a id="product-10"></a> [Prince William County official map](https://gisweb.pwcva.gov/arcgis/rest/services/Planning/Build_Out_Analysis/MapServer/9) | County building and campus map | Jurisdiction-specific public records. Public views; local terms vary. Use the county map as one local source. A second layer from the same agency is not a second independent act. |

### Market & permits

| Product | Documented output | Input / access boundary |
|---|---|---|
| <a id="product-11"></a> [DC Byte](https://www.dcbyte.com/us/analytics/) | Facility inventory, capacity, vacancy, market analysis and pull reports | Commercial curation and market inputs. Limited free map; premium quote. Use this for market forecasts and transactions. Docket would answer a narrower public-record question. |
| <a id="product-12"></a> [datacenterHawk / S&P](https://www.datacenterhawk.com/) | Commercial facility, power, fiber and forecast intelligence | Licensed market data. Quote. Use this for market and transaction intelligence. Docket would focus on a source-linked local case. |
| <a id="product-13"></a> [Cleanview platform](https://cleanview.co/) | Project pipeline and energy market analytics | Compiled data and analyst work. [Posted commercial prices](https://cleanview.co/pricing). Compare one narrowly scoped public brief with a matched output; no cost or coverage advantage is established. |
| <a id="product-14"></a> [Shovels](https://www.shovels.ai/blog/decisions-api-launch/) | Normalized permits, properties and local agenda decisions | Multi-jurisdiction permit and meeting ingestion. Trial and paid products; current quote varies. Use the feed to find a decision, then check the underlying agency record before briefing someone. |
| <a id="product-15"></a> [Accela](https://www.accela.com/solutions/building/) / [OpenGov](https://opengov.com/products/permitting-and-licensing/) | Agency permit, licensing and case workflows | Internal government records and staff actions. Agency procurement. Use these to run agency workflows. Docket could read their public decisions, with authority and terms checked. |
| <a id="product-16"></a> [NY DEC ENB](https://dec.ny.gov/news/environmental-notice-bulletin) / [DPS DMM](https://documents.dps.ny.gov/search/Home/DocumentSearch) / [IDA directory](https://abo.ny.gov/industrial-development-agency-directory-and-reports) | Original environmental, power and public-benefit acts | Agency-authored filings and records. Public read often no charge. Read these original acts first. Docket would connect the same site and phase across portals for a reviewed brief. |

### DCAM & inventory

| Product | Documented output | Input / access boundary |
|---|---|---|
| <a id="product-17"></a> [NetBox Community](https://netboxlabs.com/docs/netbox/) | IPAM, racks, cables, devices and network source of truth | Operator-maintained asset records. Apache-2.0 code; hosting and upkeep remain. An operator could authorize an inventory export for a separate stewardship use; public facility detection cannot infer it. |
| <a id="product-18"></a> [Device42](https://docs.device42.com/what-is-device42/) | Auto-discovery, dependency map, rack and asset reporting | Authorized SNMP/WMI/SSH and customer-exported NetFlow. Annual device subscription. Its authorized device and flow data answer an operator’s question that BGP and RDAP cannot answer. |
| <a id="product-19"></a> [Oomnitza](https://www.oomnitza.com/platform-overview/) | Enterprise asset reconciliation, workflow and audit reports | Internal IT/HR/security/finance integrations. Quote. Use it for an organization’s asset lifecycle. Docket’s proposed public case answers a different question. |
| <a id="product-20"></a> [Ralph](https://github.com/allegro/ralph) / [Snipe-IT](https://snipeitapp.com/) | Hardware/asset inventory and lifecycle records | Operator-entered internal inventory. Open-source code; operation costs. These inventories could inform an authorized stewardship workflow; they are not public Docket inputs. |

### DCIM operations

| Product | Documented output | Input / access boundary |
|---|---|---|
| <a id="product-21"></a> [Sunbird dcTrack / Power IQ](https://www.sunbirddcim.com/pricing) | Rack capacity, change, power and environment dashboards/reports | Operator inventory, PDU/sensor data. Cabinet/node licensing; public pricing page. Docket could trace a public energy commitment. It cannot measure a rack or cabinet without operator data. |
| <a id="product-22"></a> [Schneider EcoStruxure IT Expert](https://www.se.com/us/en/product-range/65972-ecostruxure-it-expert/) | Connected monitoring, alerts and asset views | Connected equipment and authorized operator data. Subscription by node/term; quote/sku. Live alarms need connected equipment; public OSINT does not supply that view. |
| <a id="product-23"></a> [Nlyte](https://www.nlyte.com/solutions/data-center-infrastructure-management-dcim/) | Asset, capacity, energy, workflow and operational reports | Operator facility and inventory systems. Tailored quote. Docket could trace a public energy promise to filings; Nlyte’s live operations use different inputs. |
| <a id="product-24"></a> [Vertiv Environet](https://www.vertiv.com/en-us/products-catalog/monitoring-control-and-management/software/vertiv-environet2/) | Facility trends, alerts and power/cooling reports | Onsite devices and sensors. Quote. An authorized stewardship review could cite its trend; public records cannot recreate a sensor reading. |
| <a id="product-25"></a> [Hyperview](https://hyperviewhq.com/pricing/) | Auto-discovery, 2D/3D, monitoring and report add-ons | Connected devices and operator inventory. Provider publishes per-asset pricing and a stated minimum; verify current terms for a quote. Its live asset monitoring is a different task. A Docket public brief cannot be priced as a substitute. |
| <a id="product-26"></a> [openDCIM](https://opendcim.org/features.html) | Rack, power, space, temperature and outage reports | Operator-maintained onsite inventory. GPL code; deployment/maintenance costs. Open-source facility management already exists. Docket’s proposed job is a public-record case. |
| <a id="product-27"></a> [FNT Command](https://www.fntsoftware.com/en/products/fnt-command/for-data-centers) / [Cormant](https://cormant.com/) | Cabling, capacity, assets, 2D/3D and operational views | Operator infrastructure model. Quote. Cabling and equipment views require operator access, including any future AR display. |

### Documents & policy

| Product | Documented output | Input / access boundary |
|---|---|---|
| <a id="product-28"></a> [DocumentCloud](https://www.documentcloud.org/) / [MuckRock](https://www.muckrock.com/) | OCR, annotation, publication, document packets and records requests | User-held documents and public records. Free for eligible uses; premium services/credits. Export a reviewed source packet into DocumentCloud; there is no need to claim Docket invented OCR. |
| <a id="product-29"></a> [OCCRP Aleph](https://docs.aleph.occrp.org/) | Search, OCR, entities, graphs and timelines | Investigative documents and datasets. Open-source platform; hosting costs. Use its document search and graph. Docket would apply a narrower rule to a facility claim. |
| <a id="product-30"></a> [FiscalNote PolicyNote](https://fiscalnote.com/products/policynote) | Policy tracking, AI fact sheets, reports and briefs | Licensed policy corpus and user workflow. Request pricing. It already generates policy material. Compare whether Docket’s site, phase and original-act trail improves one brief. |
| <a id="product-31"></a> [Quorum / Quincy](https://www.quorum.us/products/quincy-ai/) | Bill tracking, meeting briefs and AI summaries; [Impact Reports](https://www.quorum.us/products/impact-reports/) is a separate Quorum product | Policy/advocacy data and staff workflow. Request pricing. It already prepares policy briefs. Put one New York data-center case through both workflows. |
| <a id="product-32"></a> [Palantir Foundry Notepad](https://www.palantir.com/docs/foundry/analytics/reporting/) | Integrated analytics, templated documents and PDF reports | Configured enterprise ontology and authorized data. Enterprise quote. A configured enterprise platform can do far more. Test Docket on the bounded public-record case. |
| <a id="product-33"></a> [Maltego](https://www.maltego.com/pricing/) / [SpiderFoot](https://github.com/smicallef/spiderfoot) | Link analysis, OSINT correlation and exports | Public, internal or commercial transforms; scans can be active. Free tiers/open code plus paid plans. Use permitted corporate and infrastructure leads only; exclude person-level profiling and unauthorized scans. |

## Would this save time or money on the same brief?

- **Start with the real baseline.** One bounded public case may use original records without a national-data license. That does not make the work free. Compare with the agency portals and free offerings from [Civitar](https://civitar.org/) and [Compute Atlas](https://www.compute-atlas.com/about). [NetBox Community](https://netboxlabs.com/docs/netbox/) and [openDCIM](https://opendcim.org/features.html) are open-source tools for different, operator-side jobs.
- **Match the job.** Sunbird, Schneider, Nlyte, Vertiv, Hyperview and openDCIM use operator data for live assets, sensors and incidents. BGP and permits cannot supply those readings. Compare a public brief with another way of producing a public brief.
- **Run a fair pilot.** Choose ten representative sites, the same source cutoff and output standard. Start the clock when the original record posts; stop when the reviewer accepts a correct brief. Count missed acts, false site matches, duplicate origins, bad citations, contrary evidence and repair time. Ask the intended reader whether the result helps them act.
- **Price the whole workflow.** Include source rights, hosting, OCR/model use, maintenance, analyst and reviewer time, and corrections. Do the same for manual portals, free tools and any paid option under its actual terms. Enter measured inputs in the [interactive worksheet](https://dannybuk-byte.github.io/DCIM/comparison.html#cost).

**What we can say now:** Docket is designed to turn one versioned public case into briefs for different readers, with a possible low source-license cost for a bounded case. We have not established a free total product, a discount, faster delivery, national coverage or parity with operator-side DCIM/DCAM.

The interactive page also lists products explored earlier. We do not make current pricing or feature claims for them without a primary-source check.


[Source bibliography](./sources.md) · [Public signal atlas](./public-signal-atlas.md) · [Back to the visual guide](https://dannybuk-byte.github.io/DCIM/)
