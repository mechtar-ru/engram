# Engram → AAA: Founder Advisory Plan
**Prepared:** 2026-04-13  
**For:** NickCirv (engram founder)  
**By:** Nick Ashkar  
**Status:** Draft for founder review

---

## Executive Summary

Engram is a well-architected, underestimated project sitting at the exact right inflection point. The AI coding tool space is fragmenting rapidly — Cursor, Claude Code, Continue, Aider, Windsurf, Copilot — and every one of them is independently solving the same unsolved problem: how does an AI agent build accurate, persistent knowledge about a codebase without consuming the entire context window?

Engram already has the answer. What it lacks is the protocol, the distribution, and the ecosystem to make that answer the industry standard.

**The thesis:** Engram should not compete to be the best AI coding assistant. It should become the context layer that every AI coding assistant depends on — the way tree-sitter became the parsing layer every editor depends on. This is not a developer tool. This is infrastructure.

**The path:** Protocol First. Define the Engram Context Protocol (ECP) before anyone else does. Build the adapters. Create the gravity. Layer monetization on top of ubiquity, not before it.

**18-month outcome:** ECP is the standard for AI context management. Engram has 10k+ GitHub stars, 3+ enterprise contracts, a functioning team tier generating real MRR, and at least two major AI coding tools have officially adopted ECP. The founder is raising a Series A on the "context layer" thesis.

---

## 1. Where Engram Sits in the Market

### The Problem It Solves (Precisely)

AI agents fail in two ways with codebases:

1. **Context bloat** — feeding entire files inflates token costs, degrades attention, and caps the size of project an agent can reason about effectively
2. **Context amnesia** — each session starts from zero; decisions, patterns, and known problem areas are forgotten

Engram's hook-based interception architecture solves both simultaneously: it intercepts file reads and serves structural summaries instead of full content (82% token reduction claimed), and it persists a knowledge graph across sessions so the agent's understanding accumulates over time.

### Why the Timing Is Right

The AI coding tool market is undergoing a Cambrian explosion. Five major tools (Claude Code, Cursor, Continue, Aider, Windsurf) each have custom context management, each reinventing the same wheel. None of them has published a standard. The window to define that standard is open *now* — 12–18 months before one of them does it unilaterally, or before Anthropic/Microsoft defines it from the top down.

Being first to a protocol standard in developer tooling is a durable moat. Tree-sitter shipped in 2018 — eight years later, every serious editor uses it. OpenAPI was published in 2015 — it is now table stakes for any API. The founder who ships ECP in 2026 owns the context layer for the next decade.

### The Competitive Landscape

| Tool | Context Strategy | Gap Engram Fills |
|------|-----------------|------------------|
| Claude Code | Hook system, but no persistence | No cross-session graph, no token reduction at read time |
| Cursor | `.cursorrules`, MDC files | Static files, not derived from AST; no session learning |
| Continue | Context providers (plugin system) | No structural graph; providers are point-in-time |
| Aider | Repo map (ctags-based) | No vector search, no session learning, no hook layer |
| Copilot | Embeddings (cloud) | Privacy concerns, no local graph, no hook interception |

Engram is the only tool in this space that combines: local-first graph + AST mining + session learning + hook interception + vector semantic search (post-upgrade). No competitor has all five.

---

## 2. The Strategic Bet: Protocol First

Three paths reach the destination — open source dominance, startup monetization, enterprise, and protocol standard — but they have to be sequenced correctly.

### The Recommended Spine: Path A

**Protocol first. Community second. Revenue third. Enterprise fourth.**

This is the HashiCorp model (Terraform → Cloud → Enterprise), the Elastic model (Elasticsearch → Cloud), and the Grafana model (OSS → Cloud → Enterprise). It works because:

1. The protocol creates ubiquity before any lock-in
2. Ubiquity makes the community flywheel self-sustaining
3. Community trust makes team/enterprise features credible
4. Enterprise revenue funds the next protocol iteration

The alternative — startup first, raise capital, build team features immediately — trades the protocol moat for faster revenue. It works (see Cursor), but it caps the ceiling: you become a good tool, not infrastructure.

### What "Protocol First" Actually Means

It means the founder's first external communication after v1.0 is not "Engram is great." It is: "Here is the Engram Context Protocol. Here is why every AI coding tool should implement it. Here is the compliance test suite. We welcome tool authors to implement it."

It means keeping the core Apache 2.0 and never wavering, even when it's tempting to close-source the good parts for revenue.

It means measuring success in the first 6 months by **tool adoption** (how many tools implement ECP), not by stars or MRR.

---

## 3. Architecture: Five Layers

Each layer depends on the one below it and amplifies it. Skipping a layer — shipping Team features before the Foundation is trustworthy, or chasing Enterprise before the Community exists — creates a stack with no structural integrity.

### Layer 1 — Foundation (Accuracy Engine)
*Ship: Month 1–2*

The current regex-based AST mining is the single greatest threat to engram's credibility. Confidence scores of 0.4–0.9 on "inferred" relationships mean the hook layer is intercepting reads and sometimes serving summaries that are structurally wrong. This is tolerable in a prototype. It is disqualifying for a protocol standard.

**What changes:**
- Tree-sitter WASM replaces the regex miner for all 9 languages
- Oxc replaces tree-sitter for JavaScript/TypeScript (10–50x faster, critical for the majority of user repos)
- ast-grep enables structural code search across all supported languages
- LanceDB adds an embedded local vector store (zero infra, runs in-process alongside SQLite)
- transformers.js generates local embeddings (all-MiniLM-L6-v2, ~25MB model, no API calls)
- Hybrid graph + vector search: keyword graph traversal for known symbols, semantic vector search for conceptual queries

**Why this is the critical path:** Everything else — protocol adoption, community trust, enterprise sales — depends on the foundation being provably accurate. The benchmark report ships with this layer, and it must be honest, reproducible, and methodologically rigorous. "82% token reduction" without a methodology is marketing. The same number with a reproducible benchmark suite is a competitive weapon.

### Layer 2 — Engram Context Protocol (ECP)
*Ship: Month 2–4*

The ECP is a JSON wire protocol over HTTP/stdio that standardizes how AI coding tools query a local knowledge graph. It defines:

**Node schema** (minimum required fields):
```json
{
  "id": "string",
  "type": "function|class|module|interface|variable|file",
  "name": "string",
  "path": "string",
  "confidence": 0.0–1.0,
  "source": "extracted|inferred|ambiguous",
  "summary": "string (≤300 tokens)",
  "edges": [{"to": "id", "relation": "calls|imports|extends|uses"}]
}
```

**Query interface** (3 required endpoints):
1. `GET /node/{id}` — fetch a single node with edges
2. `POST /query` — natural language or structured graph query
3. `GET /summary/{path}` — get the context summary for a file path (this is what hooks call)

**Hook event contract** (what ECP-compliant tools emit):
- `PreToolUse:Read` → ECP server responds with node summary or passthrough
- `SessionStart` → ECP server injects project brief
- `PostToolUse:Edit` → ECP server updates affected nodes

**Privacy invariants** (required for ECP compliance):
- User prompt content is never transmitted to the ECP server
- No node content leaves the local machine in local mode
- All file paths are normalized to relative paths before storage

**Adapters to ship at launch:**
- Claude Code (hooks — already exists, polish and document)
- Continue.dev (Context Provider plugin — formal interface exists)
- Cursor (MDC file generation from graph state)
- Aider (`.aider/` config injection)
- Windsurf (rules file generation)
- VS Code extension (inline graph context, gutter indicators for hot files)
- GitHub App (Probot-based, auto-triggers `engram index` on push/PR)

### Layer 3 — Platform & Community
*Ship: Month 3–6*

The graph explorer is the "wow" moment. Text descriptions of a knowledge graph are unconvincing. Seeing your codebase rendered as a living, interactive force-directed graph — nodes sized by importance, edges colored by relationship type, hot files glowing with churn rate — is viscerally different. This is what gets the tweet. This is what makes the GitHub star spike.

**Graph Explorer:** Built on ReactFlow (xyflow/xyflow). Surfaces: god nodes (high-degree, core architecture), hot files (high churn from git history), mistake nodes (known problem areas), decision trails (session learning history). Runs locally at `localhost:PORT`, served by the Hono.js server.

**Plugin SDK:** A formal miner API that lets the community add language support. Interface:
```typescript
interface EngramMiner {
  languages: string[]
  mine(filepath: string, content: string): Promise<MinerResult>
  confidence(): number
}
```
Community miners are npm packages with the `engram-miner-` prefix, auto-discovered if installed globally.

**Public Graph Registry:** Developers can publish anonymized graph schemas (no content, only structure) for open source projects. Makes it easy to onboard to a new OSS repo — `engram import react` pulls the community graph for React.

### Layer 4 — Team Knowledge Graphs
*Ship: Month 5–9*

The team layer is architecturally unusual in a way that is a genuine competitive advantage: it requires almost no rewrite because engram already uses SQLite, and ElectricSQL syncs SQLite databases across clients using CRDTs with conflict resolution.

What this means practically: a team of 5 engineers all running engram locally gets a shared org graph where every engineer's session learning, decision tracking, and mistake annotations automatically propagate to every other engineer's local graph. The knowledge graph becomes a team asset, not an individual one.

**What ships:**
- ElectricSQL sync layer (org graph replication across team members)
- Org-level knowledge graphs with cross-repo linking
- Team dashboard: token savings per engineer, graph health, decision history
- Better Auth with OAuth for Team tier, SAML prep for Enterprise
- Self-serve onboarding: install → index → invite team in under 5 minutes

**Pricing:** $12–18/seat/month. The value prop is straightforward: if engram saves one engineer 30 minutes per day (conservative given 82% token reduction), at $100/hour fully loaded, that's $2,500/month per engineer in productivity recovered. The seat fee is 0.5–0.7% of that.

### Layer 5 — Enterprise & Protocol Governance
*Ship: Month 8–18*

Enterprise features are largely surface area on top of Layer 4, not new architecture. The local-first foundation means on-prem deployment is already solved — there is no cloud dependency to remove.

**What ships:**
- SAML/SSO via Better Auth (enterprise identity)
- Audit logs + compliance exports (SOC2 preparation)
- On-prem deployment package (Docker Compose, no external dependencies)
- Enterprise SLA + dedicated support

**Protocol Governance:** Submit ECP to the OpenJS Foundation or CNCF sandbox. This is not ego — it is strategy. A protocol governed by a foundation is harder for a competitor to fork and control. It signals longevity to enterprises making decade-long infrastructure decisions. It creates a formal working group that pulls in engineers from Cursor, Continue, and others as contributors.

---

## 4. GitHub Repo Integration Plan

These repos were selected against three criteria: (1) local-first or embeddable — no cloud infra required, (2) TypeScript-native or NAPI bindings — no language boundary friction, (3) philosophically aligned with engram's privacy-first, zero-dependency ethos.

### Layer 1: Foundation

| Repo | Role | Replaces | Integration Effort |
|------|------|----------|-------------------|
| `tree-sitter/tree-sitter` | Multi-language AST (WASM build) | Regex miner | Medium — already planned in Phase 2 |
| `oxc-project/oxc` | JS/TS AST + linter (10–50x faster) | tree-sitter for JS/TS | Medium — NAPI bindings, Node-native |
| `ast-grep/ast-grep` | Structural code search | Ad-hoc grep in query CLI | Low — CLI wrapper or NAPI |
| `lancedb/lancedb` | Embedded local vector database | Nothing (new capability) | Medium — local, no server needed |
| `xenova/transformers.js` | Local embeddings (ONNX) | Nothing (new capability) | Low — npm install, 25MB model |
| `biomejs/biome` | Linting + formatting for engram's own codebase | ESLint + Prettier | Very Low — config file change |

**Integration note on LanceDB + transformers.js:** These two together add semantic search without breaking the local-first philosophy. The embedding model runs in-process via ONNX (no GPU required, ~200ms per file on M1). LanceDB stores vectors alongside the SQLite graph in `.engram/`. Hybrid search: graph traversal for known symbols, vector similarity for conceptual queries ("find code related to authentication" without knowing the function names).

### Layer 2: Protocol & Adapters

| Repo | Role | Integration Effort |
|------|------|--------------------|
| `microsoft/vscode-extension-samples` | VS Code extension scaffolding | High — highest ROI channel (20M users) |
| `honojs/hono` | Replace dashboard server + ECP API server | Low — drop-in, same API surface |
| `continuedev/continue` | Formal Context Provider interface (adapter target) | Low — defined plugin interface |
| `probot/probot` | GitHub App for auto-indexing on push | Medium — webhook + GitHub API |

**Note on VS Code extension:** This is the highest-leverage distribution channel and the highest effort item. The existing MCP server becomes the language server backend. The extension surfaces: inline node summaries on hover, gutter indicators for hot files (high churn), and a sidebar graph explorer. Prioritize this over Cursor/Aider adapters — VS Code's install base dwarfs every other tool combined.

### Layer 3: Platform

| Repo | Role | Integration Effort |
|------|------|--------------------|
| `xyflow/xyflow` | Graph explorer (ReactFlow) | Medium — rich interactive graph |
| `biomejs/biome` | Code quality for engram's own codebase | Very Low |

### Layer 4: Team

| Repo | Role | Integration Effort |
|------|------|--------------------|
| `electric-sql/electric` | Local-first SQLite sync across team | High — but unlocks entire Team tier |
| `better-auth/better-auth` | Auth for Team (OAuth) and Enterprise (SAML) | Low–Medium |

**Note on ElectricSQL:** This is the single most architecturally elegant choice in the entire plan. ElectricSQL was designed for exactly this scenario — sync a SQLite database across multiple clients with CRDTs. Engram already uses SQLite. The team feature is not a rewrite; it is adding a sync layer to existing tables. This structural advantage should be in every investor conversation: "We get team sync for free because our local-first architecture was the right call from day one."

---

## 5. The Engram Context Protocol (ECP) — Design Principles

The ECP is the most important thing to ship. Before writing the spec, the founder should internalize these design principles:

### It Must Be Tool-Agnostic by Design
The moment the spec reads "Claude Code" or any vendor name in the required fields, it fails. ECP must be implementable by a developer who has never heard of engram. The reference implementation is engram. The spec is not.

### It Must Degrade Gracefully
Any tool that implements ECP must still work correctly if the local engram server is unavailable. Hooks that can't reach the ECP server must pass through the original operation unchanged. This is Engram's existing safety invariant #1 generalized to a protocol guarantee.

### It Must Be Versioned From Day One
ECP `v0.1` ships with the spec RFC. `v1.0` is stable and governance-body-ratified. Breaking changes require a major version bump and a deprecation period of at least 6 months. This rigor makes enterprises trust it.

### Privacy Is a First-Class Invariant
The spec must explicitly forbid transmitting: raw user prompt content, file contents (only structural summaries), and absolute file paths (relative paths only). Any ECP server claiming compliance must pass the privacy invariant test suite.

### The Test Suite Is the Real Spec
Write the compliance test suite in parallel with the spec document. An ECP-compliant tool passes the test suite. This is how OpenAPI became the standard — the validators, not the PDF.

---

## 6. Execution Roadmap

> **Note on phase overlaps:** Phases 1–4 intentionally overlap. After Phase 0 completes (the only sequential gate), subsequent phases run in parallel tracks — Protocol and Platform work proceeds concurrently, Team tier development begins while Platform is still shipping. This is deliberate: the phases are priority-ordered within a sprint cadence, not waterfall stages.

### Phase 0: Foundation Hardening (Month 1–2)
**Goal:** Make the core trustworthy enough to build a protocol on. This is the only hard sequential gate — nothing else should ship before AST accuracy is proven.

| Deliverable | Detail |
|-------------|--------|
| Tree-sitter WASM integration | All 9 languages, incremental parsing, error recovery |
| Oxc for JS/TS | NAPI binding, replaces tree-sitter for JS/TS specifically |
| LanceDB + transformers.js | Local vector store + embedding pipeline |
| Hybrid search API | Graph traversal + vector similarity, unified query interface |
| Honest benchmark suite | Reproducible, methodologically documented, multiple baselines |
| Biome integration | Replace ESLint + Prettier in engram's own codebase |
| v1.0.0 release | Semver commitment, public changelog, BREAKING CHANGES documented |

**Milestone:** Confidence ≥0.95 on all extracted AST nodes. Benchmark report published. v1.0.0 tagged.

---

### Phase 1: ECP Definition & Adapter Blitz (Month 2–4)
**Goal:** Be first to define the standard. Ship adapters before any competitor notices.

| Deliverable | Detail |
|-------------|--------|
| ECP spec v0.1 | Open RFC on GitHub, public comment period |
| ECP compliance test suite | The validators are the real spec |
| Claude Code adapter (polish) | Document existing hooks as ECP-compliant |
| Continue.dev plugin | Context Provider interface — lowest effort, meaningful reach |
| Cursor MDC adapter | Generate MDC files from current graph state |
| Aider adapter | Inject into `.aider.conf.yml` |
| Windsurf rules adapter | Generate `.windsurfrules` from graph |
| VS Code extension v0.1 | Inline node summaries, hot file gutter indicators, sidebar |
| Hono.js server rewrite | Replace dashboard server, becomes ECP API server |
| GitHub App (Probot) | Auto-index on push/PR, zero-config onboarding |
| Tool author outreach | Personal email to Continue, Cursor, Windsurf teams |

**Milestone:** ECP spec published with RFC. 5 adapters live. VS Code extension on marketplace. 1k GitHub stars. At least one non-engram tool team responds to ECP RFC.

---

### Phase 2: Platform & Community Flywheel (Month 3–6)
**Goal:** Create the gravity that makes engram the default, not just an option.

| Deliverable | Detail |
|-------------|--------|
| Graph Explorer (ReactFlow) | Pan/zoom, god node highlighting, churn heatmap, decision trails |
| Plugin SDK v1 | Formal miner API, `engram-miner-*` npm convention |
| Community miner marketplace | npm-based discovery, curated registry in docs |
| Public graph registry | Anonymized graph schemas for OSS projects |
| Token savings dashboard | Per-session, per-project real metrics |
| Benchmarks leaderboard | Community submitted, methodology-verified |
| Discord + office hours | Weekly developer office hours, founder-led |
| 3 official community miners | Swift, Kotlin, Dart (cover mobile dev) |
| Case studies | 3 teams, real numbers, published with permission |
| OSS contributor grants | $5k seed fund, 10 × $500 grants for community miners |

**Milestone:** Graph explorer live and shipping screenshots. Plugin SDK v1 with 10+ community miners. 5k stars. Published case studies with real token savings data.

---

### Phase 3: Team Knowledge Graphs (Month 5–9)
**Goal:** First revenue. Turn an individual tool into an org-level asset.

| Deliverable | Detail |
|-------------|--------|
| ElectricSQL sync layer | Org graph replication, CRDT conflict resolution |
| Org-level shared graphs | Cross-repo knowledge linking at org scope |
| Team dashboard | Per-engineer token savings, graph health, decision history |
| Better Auth (OAuth) | Email + GitHub OAuth for Team tier |
| Stripe billing | Self-serve subscription, $12–18/seat/month |
| Self-serve onboarding | Install → index → invite team in <5 minutes |
| 10 design partner teams | Free for 6 months, weekly feedback sessions |
| Seed round deck (if pre-raise) | "Context layer of AI development" thesis |

**Milestone:** ElectricSQL sync live and stable. Team plan launched with Stripe. 10 paying teams. $10k MRR. Design partner NPS ≥ 8.

---

### Phase 4: Enterprise + Protocol Governance (Month 8–18)
**Goal:** Cement the standard. Land enterprise. Begin governance conversations.

| Deliverable | Detail |
|-------------|--------|
| SAML/SSO (Better Auth) | Enterprise identity, org provisioning |
| Audit logs + compliance exports | SOC2-prep, GDPR-ready |
| On-prem deployment package | Docker Compose, zero external dependencies |
| Enterprise SLA | 99.9% uptime for sync service, dedicated support |
| ECP v1.0 stable spec | Governance-body ratified, breaking change moratorium |
| OpenJS Foundation application | Sandbox application, working group formation |
| Official integrations | 3 major tool teams adopt ECP officially |
| Enterprise case studies | Public with permission, analyst-ready |
| Series A readiness | $100k ARR, 3 enterprise contracts, ECP governance in progress |

**Milestone:** 3 enterprise contracts signed. ECP v1.0 stable. CNCF or OpenJS Foundation application submitted. 10k GitHub stars. $100k ARR.

---

## 7. Monetization Model

### Open Core with Protocol Premium

```
┌─────────────────────────────────────────────────────┐
│  ENTERPRISE (custom)                                 │
│  SAML/SSO · Audit logs · On-prem · SLA · ECP cert   │
├─────────────────────────────────────────────────────┤
│  TEAM ($12–18/seat/month)                            │
│  Shared graphs · ElectricSQL sync · Dashboard        │
│  Cross-repo linking · OAuth · Priority support       │
├─────────────────────────────────────────────────────┤
│  FREE / OPEN SOURCE (Apache 2.0)                     │
│  Local graph · All miners · ECP core · CLI           │
│  VS Code extension · All adapters · Plugin SDK       │
└─────────────────────────────────────────────────────┘
```

**What stays free, always:** The local graph engine, all AST miners, the ECP core protocol, all tool adapters, the VS Code extension, the plugin SDK, the graph explorer (local mode). The free tier must be genuinely excellent — it is the distribution channel.

**What the Team tier adds:** Sync (ElectricSQL), shared graphs, team dashboard, cross-repo linking, OAuth. These are only valuable in a multi-person context and have infrastructure costs.

**What the Enterprise tier adds:** Identity (SAML/SSO), compliance (audit logs, exports), deployment flexibility (on-prem), service guarantees (SLA), and ECP compliance certification (the ability to tell a CISO "this installation is ECP-certified").

### Unit Economics (at scale)

- 10-person engineering team saves ~2 hours/week/engineer from reduced context searching
- At $100/hour fully loaded: $2,000/week × 52 = $104,000/year recovered productivity
- Team plan at $15/seat × 10 = $150/month = $1,800/year
- **ROI: 58x**. This is the number that closes enterprise deals.

---

## 8. Community & Ecosystem Strategy

### The Three Flywheels

**Flywheel 1 — Stars → Contributors → Miners → Better Coverage → More Stars**
More language support makes engram valuable to more developers. Community miners extend coverage beyond what any single team could maintain. The Plugin SDK makes contribution accessible.

**Flywheel 2 — Tool Adoption → ECP Ubiquity → Network Effects → More Tool Adoption**
Each AI coding tool that adopts ECP makes engram more valuable. More valuable engram means more users demanding ECP from their tools. This is a standard network effect — it accelerates past a tipping point.

**Flywheel 3 — Case Studies → Enterprise Trust → Revenue → Better Infrastructure → Better Case Studies**
Real numbers from real teams are the only enterprise sales tool that works. Invest in design partner success before revenue.

### Community Investments (Month 1–6)

| Investment | Cost | Expected Return |
|------------|------|-----------------|
| OSS contributor grants ($5k) | $5k | 10 community miners, 10 advocates |
| Office hours (weekly, founder-led) | Time | Direct user insight, community loyalty |
| Discord moderation | Time | Word-of-mouth, feature signal |
| Public benchmark challenge | $0 | Community-submitted benchmarks, press coverage |
| "ECP Certified" badge program | $0 | Tool adoption incentive, ecosystem credibility |

---

## 9. Skills & Tools for Execution

The founder should use these capabilities at each phase:

| Phase | Skill | Use |
|-------|-------|-----|
| All | `security-review` | Formal audit of the 10 sentinel invariants before v1.0. Enterprise sales requires this. |
| 0–1 | `claude-api` | Build the ECP compliance test suite and graph query API with Anthropic SDK + prompt caching. |
| 1–2 | `thought-leadership` | Position ECP in the market. Write "The Context Layer Manifesto" — the essay that makes developers care. |
| 2–3 | `frontend-design` | Graph explorer UI and team dashboard. The visual experience converts skeptics. |
| 3–4 | `document-skills:pptx` | Seed and Series A decks. The "context layer of AI development" investor narrative. |
| 3–4 | `gsd:new-project` | Convert this roadmap into executable phases with tasks, verifications, and milestones. |
| 4 | `agile` | Design partner program management. Sprint structure for the enterprise pilot cycle. |

---

## 10. Key Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Anthropic or Microsoft defines their own context protocol | Medium | Critical | Ship ECP spec in Month 2, before anyone else. Tool-agnostic design means even if a competitor releases their own, ECP is already in production use. |
| Someone forks engram and moves faster | Low | High | Protocol governance body (OpenJS/CNCF) means a fork has to live with ECP or fork the protocol. Community miners and the graph registry create data network effects that forks don't inherit. |
| Tree-sitter WASM performance issues at scale | Medium | Medium | Incremental indexing (only re-mine changed files via git diff). Lazy mining (mine on first access, not upfront). Oxc handles the most common case (JS/TS) with superior performance. |
| ElectricSQL integration complexity delays Team tier | Medium | Medium | Design partner program before GA. 10 teams using alpha sync for 6 months before public launch. Keeps complexity invisible to paying customers. |
| VC pressure to close-source core for revenue | High (if raised) | Critical | Only raise from investors who explicitly understand and endorse the open core model. Make this a term in any investment agreement if possible. The protocol moat only works if the core stays open. |
| Benchmark claims aren't reproducible | High (current state) | High | Reproducible benchmark suite is a Phase 0 deliverable. Never let "82% reduction" stand as a claim without a methodology document. |

---

## 11. Founder Recommendations

These are the non-obvious calls that separate "good tool" from "infrastructure":

**1. Ship the ECP spec before the VS Code extension.** The extension gets the stars. The spec gets the moat. Don't let distribution pressure make you skip the thing that matters most. The extension is the face of engram — but only after the foundation it presents is credible. Sequence: ECP spec (Month 2) → VS Code extension (Month 3).

**2. Hire a developer advocate before a second engineer.** The protocol moat requires ecosystem adoption, which requires community trust, which requires a human who is not building features but is shipping tutorials, answering GitHub issues, and being present in Discord every day. This is not a marketing hire. It is infrastructure.

**3. Never break the local-first guarantee.** Every sync feature, every team feature, every enterprise feature must work with zero cloud dependency if the user wants. The moment engram requires a server to function, you lose the trust that makes enterprise on-prem sales possible.

**4. Make the benchmark methodology a first-class asset.** The 82% number is your most powerful claim. It needs a methodology document, a reproducible test harness, and a public dataset before you talk to investors or press. An unsubstantiated benchmark is a liability. A reproducible one is a competitive weapon.

**5. The VS Code extension is the real product.** The CLI is for power users. The extension is for everyone. Build the extension to the same quality bar as the core library — it is the face of engram for the majority of users who will never run a terminal command.

**6. Don't pitch "we save tokens." Pitch "we are the context layer."** Token savings is a feature. Being infrastructure is a company. The framing matters in every conversation — with users, with investors, with tool authors considering ECP adoption.

**7. Get the Continue.dev integration live first.** It has the lowest implementation effort (formal Context Provider interface) and meaningful reach (tens of thousands of active users). It also proves the ECP adapter model works before you build the harder integrations.

**8. The design partner program is the most important sales motion.** 10 teams, free for 6 months, weekly calls. These 10 teams become the case studies, the testimonials, the champions who tell their networks. Don't launch Team tier without them.

---

## 12. Success Metrics

### 6 Months
- [ ] v1.0.0 shipped with reproducible benchmark suite
- [ ] ECP spec v0.1 published with open RFC
- [ ] 5 tool adapters live (Claude Code, Continue, Cursor, Aider, Windsurf)
- [ ] VS Code extension on marketplace with 1k+ installs
- [ ] 1k GitHub stars
- [ ] At least 1 tool team responds to ECP RFC with interest

### 12 Months
- [ ] 5k GitHub stars
- [ ] 10+ community miners in plugin marketplace
- [ ] Graph explorer live and shipping screenshots across developer Twitter
- [ ] Team tier launched with ElectricSQL sync
- [ ] 10 paying teams, $10k MRR
- [ ] 3 published case studies with real token savings data
- [ ] ECP v0.2 incorporating community RFC feedback

### 18 Months
- [ ] 10k GitHub stars
- [ ] 3 enterprise contracts signed
- [ ] ECP v1.0 stable, governance body application submitted
- [ ] 3 major AI coding tools officially adopt ECP
- [ ] $100k ARR
- [ ] Series A conversation underway

---

## Appendix: ECP Wire Format Reference

Minimal ECP node summary (what the `PreToolUse:Read` hook returns instead of full file content):

```json
{
  "ecp_version": "0.1",
  "node": {
    "id": "auth/middleware.ts::validateToken",
    "type": "function",
    "name": "validateToken",
    "path": "auth/middleware.ts",
    "lines": [42, 67],
    "confidence": 0.98,
    "source": "extracted",
    "summary": "Validates JWT token from Authorization header. Returns decoded payload or throws 401. Known issue: doesn't handle expired refresh tokens (see session: 2026-03-15).",
    "edges": [
      {"to": "auth/jwt.ts::decode", "relation": "calls"},
      {"to": "auth/middleware.ts::checkPermissions", "relation": "calls"}
    ],
    "metadata": {
      "churn_rate": 0.12,
      "last_modified": "2026-04-01",
      "known_issues": ["expired refresh token handling"],
      "decisions": ["JWT over session cookies — 2026-01-20"]
    }
  },
  "tokens_saved": 847,
  "passthrough": false
}
```

This is what every ECP-compliant server must return. The `tokens_saved` field is how the dashboard gets its numbers. The `passthrough: false` signals to the hook layer that the summary was served successfully.

---

*End of spec. Next step: convert to GSD execution phases with `/gsd:new-project`.*
