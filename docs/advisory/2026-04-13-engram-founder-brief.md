---
type: founder-brief + claude-executable-plan
project: engram (github.com/NickCirv/engram)
prepared-by: Nick Ashkar
date: 2026-04-13
version: 1.0
claude-injectable: true
---

# ENGRAM: PROTOTYPE TO PLATFORM
### A Founder Brief and Claude Execution Plan

---

## HOW TO USE THIS DOCUMENT

**If you are the founder:** Read Parts I–IV. The execution phases (Part III) tell you exactly what to build, in what order, and why each decision matters. The business actions are yours. The code tasks are what you give Claude.

**If you are Claude:** Read Part I (Project State) in full, then execute the specific phase you've been asked to work on. Each phase has a self-contained Claude Prompt block — use it as your working context. Respect the non-negotiables in Part II. Do not skip phases or reorder tasks within a phase.

---

# PART I: PROJECT STATE
### Claude Context — Read This First

## What Engram Is

Engram is a **local-first knowledge graph system** that reduces token consumption in AI-assisted coding workflows. It sits at the Claude Code hook layer and intercepts `Read` tool calls — instead of serving full files, it returns ~300-token structural summaries derived from AST analysis, git history, and session learning. Claims 82% token reduction per session.

The core insight: more context ≠ better agent performance. Bloated context windows cause attention dilution and cap the size of project an AI agent can reason about. Engram solves this by maintaining a persistent, accurate structural model of the codebase that agents query instead of reading raw files.

## Current Tech Stack

```
Language:      TypeScript (strict, ES2022)
Runtime:       Node.js 20+
Graph:         graphology (node/edge graph data structure)
Storage:       sql.js (embedded SQLite, zero native deps)
CLI:           commander + chalk
Build:         tsup
Tests:         Vitest (486 passing)
Distribution:  npm as 'engramx' — three entry points: engram, engramx, engram-serve
License:       Apache 2.0
```

## Inferred Codebase Structure

```
src/
├── miners/          # AST miner (regex-based — critical gap), Git miner, Session miner
├── sentinel/        # 9 hook handlers (PreToolUse:Read, SessionStart, PostToolUse, etc.)
├── graph/           # graphology wrapper, node/edge types
├── db/              # sql.js SQLite interface
├── query/           # Graph traversal, BFS/DFS, path finding
├── server/          # Dashboard server (current implementation)
├── mcp/             # MCP server
├── cli/             # CLI entry points
└── gen/             # CLAUDE.md / .cursorrules generation from graph
```

## What Is Already Strong (Do Not Rewrite)

- **Safety architecture** — 10 enforced runtime invariants, errors always default to passthrough, 2-second timeout per handler via `Promise.race()`. This is production-grade. Do not change the invariant model.
- **Hook layer design** — two-tier routing (event dispatcher → tool-specific sub-router), declarative handler registry. Adding a new hook = one-line change in the registry table.
- **Test suite** — 486 passing tests with privacy invariants asserted. Maintain test coverage. Every new module needs tests.
- **Local-first philosophy** — zero cloud dependency is a product promise. Never introduce a required external service.
- **Apache 2.0 license** — non-negotiable. The core stays open source forever.

## Critical Gaps (What Needs to Change)

| Gap | Impact | Priority |
|-----|--------|----------|
| Regex-based AST mining | Confidence 0.4–0.9 on inferred relationships. Makes the protocol untrustworthy. | P0 — blocks everything |
| No vector/semantic search | Can't answer "find code related to auth" without knowing symbol names | P1 — needed for ECP |
| No standard protocol | Every tool reinventing the same wheel. Window to define standard is open now. | P1 — the moat |
| No VS Code extension | CLI-only = power users only. Extension = everyone. | P2 — distribution |
| No team sync | Individual tool only. Team graphs = monetization. | P3 — revenue |

## Non-Negotiables (Principles Claude Must Respect)

1. **Local-first always** — every feature works with zero cloud dependency. If it requires a server call to function, it doesn't ship.
2. **Errors never block Claude Code** — the passthrough invariant is sacred. Any handler failure = passthrough. Do not change this.
3. **Privacy invariant** — user prompt content is never stored, logged, or transmitted. Assert this in tests.
4. **Apache 2.0 core** — nothing in `src/` gets closed-sourced. Team/Enterprise features live in separate packages.
5. **Semver from v1.0** — breaking changes require a major version bump and migration guide.
6. **Test everything** — new modules without tests do not merge.

---

# PART II: BUSINESS BRIEF
### For Founders, Investors, Advisors

## The Opportunity in One Paragraph

The AI coding tool market is fragmenting — Claude Code, Cursor, Continue, Aider, Windsurf each managing context independently. None of them has published a standard. The window to define the **context layer** these tools all depend on is open right now, and closes in 12–18 months. Engram is the only tool in this space combining local-first graph + proper AST mining + session learning + hook interception + vector semantic search. The play: define the Engram Context Protocol (ECP) before anyone else, build adapters for every major tool, and layer monetization on top of protocol ubiquity. This is the HashiCorp model — open source infrastructure that becomes the standard, monetized through team sync and enterprise compliance.

## What You Are Building

Not a developer tool. Infrastructure. The distinction matters in every conversation:

| Developer Tool | Infrastructure |
|---------------|----------------|
| "We reduce token costs" | "We are the context layer" |
| Competes with Cursor/Continue | Is depended on by Cursor/Continue |
| Measured by users | Measured by tool adoption |
| Exits to a coding tool acquirer | Exits to infrastructure acquirer or IPO |

## The Strategic Sequence

```
Phase 0: Foundation → make the core accurate enough to trust
Phase 1: Protocol   → define ECP before anyone else does
Phase 2: Platform   → create community gravity (graph explorer + plugin SDK)
Phase 3: Team       → first revenue (shared graphs via ElectricSQL)
Phase 4: Enterprise → cement the standard (SAML, audit logs, governance)
```

Each phase unlocks the next. Phase 0 is the only hard sequential gate.

## Monetization Model

```
┌──────────────────────────────────────────────────────┐
│  ENTERPRISE (custom)                                  │
│  SAML/SSO · Audit logs · On-prem · SLA · ECP cert    │
├──────────────────────────────────────────────────────┤
│  TEAM ($15/seat/month)                                │
│  Shared graphs · ElectricSQL sync · Team dashboard    │
│  Cross-repo linking · OAuth · Priority support        │
├──────────────────────────────────────────────────────┤
│  FREE / OSS (Apache 2.0) — always excellent           │
│  Local graph · All miners · ECP protocol              │
│  VS Code extension · All adapters · Plugin SDK        │
└──────────────────────────────────────────────────────┘
```

**Unit economics for a 10-person team:**
- Conservative: 30 min/day saved per engineer from reduced context churn
- At $100/hr fully loaded: $2,500/month per engineer in recovered productivity
- Team plan cost: $15 × 10 = $150/month
- **ROI: 16x in month 1. Use this number in every enterprise conversation.**

## Investor Narrative (Seed Round)

> "The AI coding tool market is splitting into a hundred specialized tools, each solving context management independently. We've identified the coordination layer they all need — a local-first knowledge graph that any AI coding tool can depend on, governed by an open protocol we're defining now. We're the tree-sitter of AI context. The core is Apache 2.0 and will remain so. Revenue comes from team sync and enterprise compliance. We're raising $[X] to ship the protocol standard, sign 10 design partner teams, and reach $10k MRR within 9 months."

**Metrics for the deck:**
- 82% token reduction (methodology-backed — see Phase 0 benchmark requirement)
- 486 passing tests, 10 enforced safety invariants
- Apache 2.0, local-first, zero cloud dependency
- TAM: $4B+ developer tools, $20B+ enterprise software

## Community Launch Strategy

### HN Post (ship with v1.0 + benchmark report)
> **Title:** "Show HN: Engram — local-first codebase knowledge graph that cuts AI coding tokens 80%+"
> **Timing:** Tuesday–Thursday, 9–11am ET
> **Lead with:** reproducible benchmark numbers + local-first story (no cloud, no API keys)
> **Second paragraph:** the ECP protocol angle — this is for the category-defining narrative

### Twitter/X Thread (ship with graph explorer, Phase 2)
- Tweet 1: Screen recording of graph explorer on a real repo
- Tweet 2: Token savings numbers with methodology link
- Tweet 3: The protocol angle — "every AI coding tool should implement this"
- Tweet 4: Link to ECP spec RFC + call for tool authors to comment

### Discord Communities to Post In
- claude-dev (Anthropic community)
- cursor-community
- continue-dev
- AI Engineers (large Slack)

## Partnership Outreach (Phase 1 — personal emails, not cold outreach)

| Tool | Contact | Ask |
|------|---------|-----|
| Continue.dev | @sestinj (Nate Sesti, founder) | "ECP implements your Context Provider interface — want to co-announce?" |
| Cursor | cursor.sh contact form | "ECP adapter ready — want official integration docs in your repo?" |
| Aider | @paul-gauthier (GitHub, Paul Gauthier) | "ECP adapter for aider ships Month 2 — would you link it from docs?" |
| Windsurf | @codeiumdev team | "ECP generates .windsurfrules from your live graph — co-marketing?" |

**Tone:** peer-to-peer, no sales language. You're defining a standard that benefits them too. Frame ECP as a community asset, not a product.

---

# PART III: PHASE-BY-PHASE EXECUTION
### Business Actions + Code Tasks + Claude Prompts

---

## PHASE 0: FOUNDATION HARDENING
**Duration:** Month 1–2  
**Business goal:** Establish the technical credibility required to pitch ECP to tool authors and investors.  
**Code goal:** Replace regex AST mining. Add vector search. Ship reproducible benchmarks. Tag v1.0.

> This is the only hard sequential gate. Do not start Phase 1 until Phase 0 milestones are met.

### Business Actions (Founder)
- [ ] Register `engram.dev` domain and redirect to GitHub until site is ready
- [ ] Register `ecp.dev` or `engram-protocol.dev` for the future ECP spec site
- [ ] Write "Engram v1.0: What We Built and Why" launch post (publish with v1.0 tag)
- [ ] Commission reproducible benchmark report (methodology must be public, datasets must be public, any developer can reproduce the numbers)
- [ ] Draft CONTRIBUTING.md — contributor onboarding in under 10 minutes
- [ ] Open GitHub Discussions — replace any GitHub Issues usage for RFCs

### Code Tasks (Give to Claude)

```
TASK 0.1 — Replace regex AST with tree-sitter WASM
Files:      src/miners/ast/index.ts (rewrite), src/miners/ast/treesitter.ts (new)
Package:    npm install web-tree-sitter
Languages:  TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, C/C++
WASM files: Download language-specific .wasm grammars, bundle in src/miners/ast/grammars/
Constraint: Incremental parsing — only re-mine files changed since last git commit
Constraint: Error recovery — tree-sitter handles malformed files gracefully, never throws
Output:     MinerResult with confidence: 1.0 for all extracted nodes (source: 'extracted')
Test:       Unit tests for each language, covering: classes, functions, imports, exports
Acceptance: All 9 languages parse. Zero extracted nodes with confidence < 0.95.
```

```
TASK 0.2 — Add Oxc for JS/TS (replaces tree-sitter for JS/TS specifically)
Files:      src/miners/ast/oxc.ts (new), src/miners/ast/index.ts (route JS/TS to oxc)
Package:    npm install oxc-parser (NAPI binding, no separate binary needed)
Scope:      JavaScript (.js, .jsx, .mjs, .cjs) and TypeScript (.ts, .tsx, .d.ts) only
Rationale:  Oxc is 10–50x faster than tree-sitter for JS/TS. Most user repos are JS/TS.
Constraint: Same MinerResult interface as tree-sitter miner — drop-in replacement
Test:       Benchmark oxc vs tree-sitter on a 1000-file TypeScript project, log results
Acceptance: JS/TS indexing completes in <2 seconds for a 500-file repo on M1 Mac.
```

```
TASK 0.3 — Add ast-grep structural search
Files:      src/query/structural.ts (new), src/cli/commands/search.ts (new CLI command)
Package:    npm install @ast-grep/napi
Use:        Powers `engram search "<pattern>"` — structural code search across all files
Example:    `engram search "function $A($$$) { $$$ }"` finds all function definitions
Constraint: Must respect the existing query interface — structural search is one query type
Test:       Integration test: search a fixture repo for known patterns, verify results
Acceptance: `engram search` command works for all 9 supported languages.
```

```
TASK 0.4 — Add LanceDB embedded vector store
Files:      src/vector/store.ts (new), src/vector/index.ts (new)
Package:    npm install vectordb (LanceDB Node.js binding)
Storage:    .engram/vectors/ (alongside existing .engram/graph.db)
Schema:     { nodeId: string, embedding: Float32Array, path: string, summary: string }
Lifecycle:  Create on init, update on file change (incremental), persist across sessions
Interface:  vectorStore.search(embedding: Float32Array, k: number): Promise<VectorResult[]>
Test:       Store 100 nodes, query by embedding, verify top-k results are semantically relevant
Acceptance: Vector store initializes without error. Search returns results in <100ms for 10k nodes.
```

```
TASK 0.5 — Add local embeddings via transformers.js
Files:      src/embeddings/pipeline.ts (new), src/embeddings/model.ts (new)
Package:    npm install @xenova/transformers
Model:      Xenova/all-MiniLM-L6-v2 (25MB ONNX, cached in .engram/models/ after first run)
Input:      Node summary string (≤300 tokens)
Output:     Float32Array (384 dimensions)
Constraint: Model download is lazy — only on first use, with progress indicator
Constraint: Embedding is async and non-blocking — never delays a hook response
Test:       Embed 10 different summaries, verify embeddings differ, verify cosine similarity works
Acceptance: Model downloads once, embeddings generate in <200ms per node on M1 Mac.
```

```
TASK 0.6 — Hybrid search query (graph + vector)
Files:      src/query/hybrid.ts (new), src/query/index.ts (update to expose hybrid)
Logic:
  - If query contains known symbol names → use graph traversal (BFS/DFS)
  - If query is natural language → use vector similarity search
  - If mixed → run both, merge results, deduplicate by nodeId, rank by combined score
Interface:  hybridSearch(query: string, k?: number): Promise<HybridResult[]>
CLI:        Update `engram query` to use hybrid search
Test:       Query "find authentication code" on a fixture repo, verify auth-related nodes rank high
Acceptance: Hybrid search returns more relevant results than graph-only for 80% of NL queries.
```

```
TASK 0.7 — Reproducible benchmark harness
Files:      bench/harness.ts (new), bench/fixtures/ (new), bench/run.ts (new CLI)
Baselines:
  - Baseline A: Read full files (no engram) — measure tokens consumed
  - Baseline B: Engram graph summaries — measure tokens consumed
  - Baseline C: Engram hybrid search — measure tokens consumed
Fixtures:   3 public repos of different sizes: small (1k files), medium (10k files), large (50k files)
Output:     bench/results/YYYY-MM-DD.json — machine-readable, reproducible
Report:     bench/METHODOLOGY.md — explains every measurement decision
Acceptance: Any developer can clone the repo and reproduce results within 10% variance.
```

```
TASK 0.8 — Replace ESLint + Prettier with Biome
Files:      biome.json (new), remove .eslintrc, .prettierrc
Package:    npm install --save-dev @biomejs/biome
Config:     Strict TypeScript rules, 2-space indent, single quotes, trailing commas
CI:         Add `biome check --apply` to pre-commit hook
Acceptance: `npx biome check .` passes with zero errors on the existing codebase.
```

### Claude Prompt — Phase 0 (Copy-Paste Ready)

```
Project: engram (github.com/NickCirv/engram)
Stack: TypeScript (strict, ES2022), Node.js 20+, graphology, sql.js, vitest
Phase: 0 — Foundation Hardening

Context:
Engram is a local-first codebase knowledge graph that intercepts Claude Code hook
calls and returns structural summaries instead of full file content. The current AST
miner uses regex and produces confidence scores of 0.4–0.9 on inferred relationships.
Everything else in the system is well-architected and should not be rewritten.

Your task this session: [PICK ONE TASK from Phase 0 above and paste it here]

Non-negotiables:
- Local-first always — no required external services
- Errors never block Claude Code — all handler failures must passthrough
- Privacy invariant — user prompt content is never stored or logged
- Test coverage — every new module needs Vitest tests
- Do not rewrite existing working code — extend and replace specific modules only

Success criteria: [from the task's Acceptance field above]
```

### Phase 0 Milestones
- [ ] All 9 languages parse with confidence ≥ 0.95 on extracted nodes
- [ ] Benchmark methodology published in `bench/METHODOLOGY.md`
- [ ] LanceDB + transformers.js integrated and tested
- [ ] `engram query` uses hybrid search
- [ ] Biome passes with zero errors
- [ ] v1.0.0 tagged with changelog

---

## PHASE 1: ENGRAM CONTEXT PROTOCOL (ECP)
**Duration:** Month 2–4  
**Business goal:** Define the standard before anyone else. Get 3+ tool teams engaging with the RFC.  
**Code goal:** Ship the ECP spec, Hono.js server, 5 tool adapters, VS Code extension, GitHub App.

> Start this phase while Phase 0 benchmarks are being validated. The spec writing is parallel to code work.

### Business Actions (Founder)

- [ ] **Write the ECP RFC** — publish as a GitHub Discussion with open comment period. Title: "RFC: Engram Context Protocol v0.1 — a standard for AI tool context management". Tag with `rfc` label.
- [ ] **Write "The Context Layer Manifesto"** — a 1,500-word essay explaining why AI coding tools need a shared context protocol. This is the HN submission. Publish on dev.to or personal blog, then submit to HN. Lead with the tree-sitter analogy.
- [ ] **Personal outreach to 4 tool founders** — email, not DM. Use the partnership table in Part II. Send after the RFC is live so you can link to it. One email per week, not a blast.
- [ ] **ECP Certified badge** — create a simple SVG badge for `README.md` that tool authors can add when they implement ECP. This is free marketing.
- [ ] **Publish v0.1 compliance test suite** — separate repo: `engram-protocol/ecp-compliance`. Tool authors self-certify. The badge requires passing the test suite.

### Code Tasks (Give to Claude)

```
TASK 1.1 — ECP type definitions and wire format
Files:      src/ecp/types.ts (new), src/ecp/schema.ts (new)
Define:
  ECPNode: {
    id: string                          // "path/to/file.ts::SymbolName"
    type: 'function'|'class'|'module'|'interface'|'variable'|'file'
    name: string
    path: string                        // relative, POSIX format
    lines: [number, number]             // start, end line numbers
    confidence: number                  // 0.0–1.0
    source: 'extracted'|'inferred'|'ambiguous'
    summary: string                     // ≤300 tokens
    edges: Array<{ to: string, relation: 'calls'|'imports'|'extends'|'uses' }>
    metadata: {
      churn_rate?: number
      last_modified?: string
      known_issues?: string[]
      decisions?: string[]
    }
  }
  ECPResponse: {
    ecp_version: '0.1'
    node: ECPNode
    tokens_saved: number
    passthrough: false
  }
  ECPPassthrough: {
    ecp_version: '0.1'
    passthrough: true
    reason: string
  }
  ECPQuery: {
    query: string                       // natural language or structured
    path?: string                       // optional: scope to file
    type?: ECPNode['type']             // optional: filter by node type
    limit?: number                     // default: 10
  }
Acceptance: All types exported from src/ecp/index.ts. Zero 'any' types.
```

```
TASK 1.2 — Hono.js ECP API server (replaces existing dashboard server)
Files:      src/server/index.ts (rewrite with Hono), src/server/routes/ (new directory)
Package:    npm install hono
Routes:
  GET  /health                         → { status: 'ok', version: string, graph_nodes: number }
  GET  /node/:id                       → ECPResponse | ECPPassthrough
  POST /query                          → ECPResponse[] (array of results)
  GET  /summary/:path                  → ECPResponse | ECPPassthrough  ← this is what hooks call
  GET  /stats                          → { nodes: number, edges: number, tokens_saved_session: number }
Middleware: request logging, error handling (always returns valid JSON, never crashes)
Constraint: Server start time <500ms. All routes respond in <100ms for local graphs.
Test:       Integration tests for all routes using Hono's test utilities
Acceptance: All routes tested. Server runs alongside existing CLI. No breaking changes to MCP server.
```

```
TASK 1.3 — Refactor Claude Code adapter to ECP compliance
Files:      src/adapters/claude-code.ts (new), src/sentinel/ (update hook handlers)
Goal:       Extract the Claude Code-specific hook logic into a named adapter module
            that explicitly implements the ECP hook contract
ECP hooks to formalize:
  - preToolUseRead(path: string): Promise<ECPResponse | ECPPassthrough>
  - sessionStart(): Promise<{ brief: string }>
  - postToolUseEdit(path: string, content: string): Promise<void>
Constraint: Zero behavioral changes — this is a refactor. All 486 tests must still pass.
Document:   Add JSDoc to every public method explaining ECP compliance
Acceptance: `src/adapters/claude-code.ts` exports a complete ECP-compliant adapter.
            All existing tests pass. New adapter has its own test file.
```

```
TASK 1.4 — Continue.dev context provider adapter
Files:      src/adapters/continue.ts (new), docs/adapters/continue.md (new)
Interface:  Implements Continue.dev's ContextProvider interface (check their SDK types)
Package:    Reference https://github.com/continuedev/continue for ContextProvider spec
Methods:
  getContextItems(query, extras): returns ECPNode[] formatted as Continue ContextItems
  loadSubmenuItems(): returns top god nodes as submenu options
Constraint: No dependency on Continue SDK — implement the interface by duck typing
Doc:        docs/adapters/continue.md explains installation (copy adapter to .continue/config)
Acceptance: Adapter file works as a Continue.dev custom context provider.
            Tested against Continue's context provider type signature.
```

```
TASK 1.5 — Cursor MDC adapter
Files:      src/adapters/cursor.ts (new), src/gen/mdc.ts (new)
Goal:       Generate a valid .cursor/rules/engram.mdc file from current graph state
MDC format: Cursor's Markdown Context format — see cursor.sh/docs for spec
Content:    God nodes (top 10 by degree), recent decisions, known issues, hot files
Command:    `engram gen cursor` → writes .cursor/rules/engram.mdc
Watch mode: `engram watch --cursor` → regenerates MDC on graph change
Constraint: MDC file must be valid Cursor MDC syntax. Use Cursor's published format spec.
Acceptance: Generated MDC loads in Cursor without errors. Contains accurate graph data.
```

```
TASK 1.6 — Aider adapter
Files:      src/adapters/aider.ts (new)
Goal:       Inject engram graph context into aider's .aider.conf.yml read-system-prompt
Command:    `engram gen aider` → appends engram context block to .aider.conf.yml
Content:    Same content as CLAUDE.md generation (already implemented) adapted for aider format
Constraint: Never overwrites existing .aider.conf.yml content — only appends/updates engram block
            Use marker comments: # [engram:start] ... # [engram:end]
Acceptance: `engram gen aider` creates or updates .aider.conf.yml without corrupting it.
```

```
TASK 1.7 — Windsurf rules adapter
Files:      src/adapters/windsurf.ts (new)
Goal:       Generate a .windsurfrules file from current graph state
Format:     Same as .cursorrules — Markdown with structured sections
Command:    `engram gen windsurf` → writes .windsurfrules
Content:    Architecture overview, god nodes, recent decisions, hot files, known issues
Constraint: Never overwrites custom content — use marker blocks for engram sections
Acceptance: Generated .windsurfrules file is valid Windsurf format and loads correctly.
```

```
TASK 1.8 — VS Code Extension (highest priority distribution channel)
Files:      packages/vscode/ (new package), packages/vscode/src/extension.ts (entry)
Setup:      Follow microsoft/vscode-extension-samples scaffolding
Backend:    Calls the Hono ECP API server (must be running — extension starts it if not)
Features (in priority order):
  1. Hover provider — hover over a function/class → show ECPNode summary in popup
  2. Gutter decorations — hot files (high churn) get a flame icon in the gutter
  3. Status bar — shows graph node count + session token savings
  4. Command: "Engram: Show Graph Explorer" → opens graph explorer in webview
  5. Command: "Engram: Query" → input box → shows results in output panel
Package:    Publish to VS Code marketplace as 'engram-vscode'
Constraint: Extension activates lazily — does not slow VS Code startup
Test:       Extension integration tests using @vscode/test-electron
Acceptance: Extension installs from .vsix, hover shows node summaries, gutter decorations appear.
```

```
TASK 1.9 — GitHub App (Probot-based auto-indexing)
Files:      packages/github-app/ (new package)
Package:    npm install probot
Events:     push → `engram index` on changed files, pull_request.opened → index PR branch
Auth:       GitHub App authentication (not personal token)
Deployment: Designed for Vercel/Railway one-click deploy (serverless Probot)
Constraint: Never reads file content — only triggers indexing on the user's local machine
            The app sends a webhook to a local engram server (if configured) or just logs
Zero-config: Installing the GitHub App on a repo requires no local configuration
Acceptance: GitHub App installs on a test repo. Push event triggers and logs successfully.
```

```
TASK 1.10 — ECP compliance test suite (separate package)
Files:      packages/ecp-compliance/ (new package, published separately as 'ecp-compliance')
Goal:       A test harness that any ECP-compliant server must pass to earn the badge
Tests:
  - Health endpoint returns correct schema
  - Node endpoint returns ECPResponse or ECPPassthrough (never throws)
  - Summary endpoint for unknown path returns passthrough (not error)
  - Privacy: user prompt content cannot be extracted from any endpoint
  - Performance: all endpoints respond in <200ms for graphs up to 10k nodes
  - Versioning: ecp_version field present in all responses
Usage:      `npx ecp-compliance http://localhost:PORT` → pass/fail with report
Acceptance: Test suite passes against engram's own ECP server. Published to npm.
```

### Claude Prompt — Phase 1 (Copy-Paste Ready)

```
Project: engram (github.com/NickCirv/engram)
Stack: TypeScript (strict, ES2022), Node.js 20+, graphology, sql.js, hono, vitest
Phase: 1 — Engram Context Protocol (ECP)

Context:
Engram is a local-first codebase knowledge graph. Phase 0 is complete:
- Tree-sitter WASM replaces regex mining (confidence ≥ 0.95)
- LanceDB + transformers.js added for vector search
- Hono.js server is the ECP API server on localhost
- ECP types are defined in src/ecp/types.ts

The ECP wire format is:
  ECPResponse: { ecp_version: '0.1', node: ECPNode, tokens_saved: number, passthrough: false }
  ECPPassthrough: { ecp_version: '0.1', passthrough: true, reason: string }

Your task this session: [PICK ONE TASK from Phase 1 above and paste it here]

Non-negotiables:
- Local-first always — no required external services
- Errors never block Claude Code — all handler failures must passthrough
- Privacy invariant — user prompt content never stored or transmitted
- Apache 2.0 — all code in src/ and packages/ stays open source
- Test coverage — every new module needs Vitest tests

Success criteria: [from the task's Acceptance field above]
```

### Phase 1 Milestones
- [ ] ECP spec v0.1 published as GitHub RFC
- [ ] Hono.js ECP server running with all routes tested
- [ ] 5 tool adapters live (Claude Code, Continue, Cursor, Aider, Windsurf)
- [ ] VS Code extension on marketplace with 100+ installs
- [ ] GitHub App deployed and functional
- [ ] ECP compliance test suite published to npm
- [ ] 3 tool founders have responded to the RFC
- [ ] 1k GitHub stars

---

## PHASE 2: PLATFORM & COMMUNITY
**Duration:** Month 3–6  
**Business goal:** Create gravity. Make engram the default choice via community flywheel.  
**Code goal:** Graph explorer, Plugin SDK, Hono server consolidation, community infrastructure.

### Business Actions (Founder)

- [ ] **Launch Discord** — channels: #general, #show-and-tell, #help, #ecp-protocol, #miner-dev. Pin the ECP RFC link in #ecp-protocol.
- [ ] **Weekly office hours** — 30 min, Thursdays, founder-hosted. Record and post. This is not optional — community trust is built by founder presence, not features.
- [ ] **OSS contributor grants** — $5k total, 10 × $500 grants for accepted community miners. Announce in Discord and on Twitter. Low cost, high signal.
- [ ] **Graph explorer launch tweet thread** — screen recording of graph explorer on a real repo. This is the viral moment. Schedule for a Tuesday, peak engagement.
- [ ] **3 published case studies** — find 3 teams using engram, get their token savings numbers, write 500-word case studies. These become the B2B sales tool for Phase 3.
- [ ] **Public benchmark challenge** — "Show us your engram benchmark. Best result gets $500." Drives community benchmarks, generates press coverage, proves the numbers.

### Code Tasks (Give to Claude)

```
TASK 2.1 — Graph Explorer (ReactFlow-based web UI)
Files:      packages/explorer/ (new React package, TypeScript)
Package:    npm install @xyflow/react (ReactFlow v12)
Stack:      React + TypeScript + ReactFlow + Tailwind CSS (local styles only, no CDN)
Data source: ECP Hono server (GET /graph endpoint — add this to Phase 1 server)
Nodes:      Each ECPNode is a ReactFlow node. Color by type, size by edge count.
Edges:      Each ECPEdge is a ReactFlow edge. Color by relation type.
God nodes:  Top 10 by degree — highlighted with glow effect, pinned in center
Hot files:  Churn rate > 0.3 — red border decoration
Features:
  - Pan + zoom (ReactFlow built-in)
  - Click node → sidebar shows full ECPNode details
  - Search box → filters visible nodes to matches
  - Minimap (ReactFlow built-in)
  - Export: `engram explorer export` → saves graph as SVG
Serve:      `engram explore` → starts explorer on localhost:PORT, opens browser
Constraint: Runs entirely locally. Zero external API calls from the explorer.
Acceptance: Explorer loads a 1k-node graph in <2 seconds. Pan/zoom is smooth at 60fps.
```

```
TASK 2.2 — Plugin SDK (formal Miner API)
Files:      src/plugins/sdk.ts (new), src/plugins/loader.ts (new), src/plugins/registry.ts (new)
Interface:
  interface EngramMiner {
    name: string
    version: string
    languages: string[]                    // file extensions: ['.kt', '.swift']
    mine(filepath: string, content: string): Promise<MinerResult>
    confidence(): number                   // static confidence declaration for this miner
  }
Discovery:  Scan globally installed npm packages with prefix 'engram-miner-'
            Load via dynamic import (lazy — only load if file extension matches)
Registry:   MinerRegistry.register(miner: EngramMiner): void
            MinerRegistry.getForFile(path: string): EngramMiner | null
Bundled:    Move existing tree-sitter miner into Plugin SDK format (internal plugin)
Command:    `engram plugins list` → show installed community miners
Command:    `engram plugins install engram-miner-swift` → npm install + register
Docs:       docs/plugin-sdk.md — how to write a community miner, with template
Acceptance: Plugin SDK loads a test miner. `engram plugins list` shows installed miners.
            Writing a new miner requires only implementing the EngramMiner interface.
```

```
TASK 2.3 — Token savings metrics pipeline
Files:      src/metrics/session.ts (new), src/metrics/store.ts (new)
Track (per session):
  - tokens_saved: number (sum of ECPResponse.tokens_saved across all hook calls)
  - files_intercepted: number (PreToolUse:Read calls that returned summary vs passthrough)
  - passthrough_rate: number (% of reads that were passthroughs — should be <20%)
  - session_duration_minutes: number
Store:      Append to .engram/metrics.jsonl (one JSON line per session)
CLI:        `engram stats` → show session stats + cumulative totals
Dashboard:  Expose via GET /metrics on Hono server (used by VS Code extension status bar)
Privacy:    Metrics contain only counts and token numbers — never file names or content
Acceptance: `engram stats` shows accurate session token savings. Metrics persist across sessions.
```

```
TASK 2.4 — Public graph registry client
Files:      src/registry/client.ts (new), src/registry/types.ts (new)
Purpose:    Developers can publish anonymized graph schemas for OSS projects
            Others can download pre-built graphs to bootstrap on a new OSS repo
Protocol:   Registry is a simple HTTPS endpoint (can be GitHub-hosted JSON initially)
Schema format: { project: string, version: string, nodes: ECPNode[] (summary only, no content) }
Commands:
  `engram registry push <project-name>` → publish current graph (anonymized)
  `engram registry pull react` → download community graph for React, merge with local
Constraint: Registry push strips all file content, absolute paths, and personal metadata
            Only structure is shared: node names, types, edges, summaries
Phase 2:    Registry can be a GitHub repo (engram-protocol/graph-registry) — no server needed
Acceptance: `engram registry pull` merges a downloaded graph correctly. Push anonymizes properly.
```

### Claude Prompt — Phase 2 (Copy-Paste Ready)

```
Project: engram (github.com/NickCirv/engram)
Stack: TypeScript, Node.js 20+, React (explorer only), ReactFlow, graphology, sql.js, hono, vitest
Phase: 2 — Platform & Community

Context:
Engram is a local-first codebase knowledge graph with ECP protocol support.
Phases 0 and 1 are complete:
- Tree-sitter + oxc AST mining (confidence ≥ 0.95)
- LanceDB + transformers.js vector search
- Hono.js ECP API server on localhost
- 5 tool adapters (Claude Code, Continue, Cursor, Aider, Windsurf)
- VS Code extension on marketplace
- ECP compliance test suite published

The graph explorer is a React app in packages/explorer/ that reads from the Hono ECP server.
The Plugin SDK is the miner API at src/plugins/sdk.ts.

Your task this session: [PICK ONE TASK from Phase 2 above and paste it here]

Non-negotiables:
- Local-first always — zero external API calls from explorer or SDK
- Apache 2.0 — all code stays open source
- Plugin SDK interface is stable after v1 — breaking changes require major version bump
- Test coverage — every new module needs tests

Success criteria: [from the task's Acceptance field above]
```

### Phase 2 Milestones
- [ ] Graph explorer live, used in launch tweet thread
- [ ] Plugin SDK v1 published with docs + template
- [ ] Token savings metrics pipeline live in VS Code status bar
- [ ] 10+ community miners in npm (Swift, Kotlin, Dart minimum)
- [ ] Discord launched with 200+ members
- [ ] 3 published case studies with real numbers
- [ ] 5k GitHub stars

---

## PHASE 3: TEAM KNOWLEDGE GRAPHS
**Duration:** Month 5–9  
**Business goal:** First revenue. Sign 10 design partner teams free for 6 months. Launch Team tier.  
**Code goal:** ElectricSQL sync, org graphs, team dashboard, Better Auth, Stripe.

### Business Actions (Founder)

- [ ] **Design partner program** — 10 teams, free for 6 months, weekly 30-min calls. Selection criteria: 5+ engineers, active AI coding tool users, willing to share anonymized token savings data for case studies. Announce via Discord + personal network.
- [ ] **Pricing announcement post** — "Engram Team: $15/seat. Here's the math." Show the 16x ROI calculation. Publish on dev.to, cross-post to HN.
- [ ] **Stripe setup** — use Stripe Billing, monthly subscriptions, seat-based. Offer annual (2 months free) from launch.
- [ ] **Seed round (if not raised)** — with $10k MRR and 10 case studies, the seed deck works. Raise $1–2M. Focus on funds with infrastructure/DevTools thesis: a16z (infrastructure), Boldstart (enterprise OSS), Gradient Ventures (Google, AI tools).
- [ ] **Self-serve onboarding flow** — install → `engram init` → `engram team invite` → working in <5 minutes. Record a Loom walkthrough, embed on engram.dev.

### Code Tasks (Give to Claude)

```
TASK 3.1 — ElectricSQL sync layer
Files:      src/sync/electric.ts (new), src/sync/schema.ts (new), src/sync/index.ts (new)
Package:    npm install electric-sql
Goal:       Sync the SQLite graph database across team members using ElectricSQL CRDTs
Schema:     Expose existing graph tables to Electric sync protocol
            Only sync: nodes table, edges table, decisions table, known_issues table
            Never sync: user prompts, file contents, personal metadata
Setup:      `engram team init` → initializes Electric sync for the project
            `engram team join <invite-code>` → joins an existing team graph
Conflict:   Use CRDT merge (last-write-wins on node summaries, append-only on edges)
Constraint: Sync is optional — `engram` without team config works identically to Phase 0
Constraint: Team members each run their own local engram — sync is background, non-blocking
Test:       Simulate 2-user sync: both add nodes, verify merge is consistent
Acceptance: Two separate engram instances sync graph changes within 30 seconds.
            Offline users catch up when reconnected. No data loss on conflict.
```

```
TASK 3.2 — Org-level graph and cross-repo linking
Files:      src/org/graph.ts (new), src/org/linker.ts (new)
Goal:       Maintain an org-level graph that aggregates across multiple repos
            A function in repo A that calls a function in repo B gets a cross-repo edge
Detection:  Parse import statements for cross-repo references (monorepo + multi-repo)
Storage:    Separate .engram/org-graph.db (not mixed with per-repo graph)
Commands:
  `engram org init` → initialize org graph, specify which repos to include
  `engram org link` → detect and create cross-repo edges
  `engram org query <query>` → query across all repos
Constraint: Cross-repo edges are marked with source: 'inferred' (confidence: 0.7)
            They are never shown as source: 'extracted' without verified import resolution
Acceptance: Org graph correctly links function calls across 2 repos in integration test.
```

```
TASK 3.3 — Team dashboard (web app)
Files:      packages/dashboard/ (new React package)
Stack:      React + TypeScript + Tailwind CSS + Recharts (charts)
Data:       Reads from Hono ECP server (new team-specific endpoints needed)
Pages:
  /          → Overview: total tokens saved, graph health score, active members
  /members   → Per-engineer token savings, files indexed, session count
  /graph     → Graph explorer (embed packages/explorer)
  /decisions → Timeline of all team decisions captured by session miner
  /issues    → Known issues list with assignee + status tracking
Auth:       Better Auth session cookie (Phase 3.4)
Serve:      `engram dashboard` → starts on localhost:PORT, opens browser
Constraint: Dashboard reads local data — no external API calls
Acceptance: Dashboard loads with accurate team data. All pages render correctly.
```

```
TASK 3.4 — Better Auth integration
Files:      src/auth/index.ts (new), src/auth/providers.ts (new)
Package:    npm install better-auth
Providers (Phase 3): GitHub OAuth, Google OAuth, email magic link
Providers (Phase 4): SAML, SCIM (enterprise)
Use:        Protects team dashboard and team sync API
            Individual local use (no team) requires no auth
Org model:  Organization entity with members, roles (owner, member), invite codes
Storage:    better-auth SQLite adapter → stores in .engram/auth.db
Commands:
  `engram auth login` → opens browser for OAuth
  `engram auth status` → shows current user + org membership
Constraint: Auth is only required for team features. Local solo use has zero auth friction.
Acceptance: GitHub OAuth login works. User can create org, invite member, member joins.
```

```
TASK 3.5 — Stripe billing integration
Files:      src/billing/stripe.ts (new), src/billing/webhook.ts (new)
Package:    npm install stripe
Plans:      Team ($15/seat/month), Team Annual ($150/seat/year)
Webhooks:   checkout.session.completed → activate team features
            customer.subscription.deleted → deactivate team features
            invoice.payment_failed → send notification, grace period 7 days
Commands:
  `engram billing upgrade` → redirects to Stripe Checkout
  `engram billing status` → shows current plan, next billing date, seat count
Constraint: Billing is server-side only — Stripe secret key never in client code
            Use environment variable ENGRAM_STRIPE_SECRET_KEY
Acceptance: End-to-end: upgrade flow → Stripe Checkout → webhook → team features active.
```

### Claude Prompt — Phase 3 (Copy-Paste Ready)

```
Project: engram (github.com/NickCirv/engram)
Stack: TypeScript, Node.js 20+, React, graphology, sql.js, hono, electric-sql,
       better-auth, stripe, vitest
Phase: 3 — Team Knowledge Graphs

Context:
Engram is a local-first codebase knowledge graph. Phases 0–2 complete:
- Tree-sitter + oxc AST, LanceDB vector search
- Hono ECP server, 5 tool adapters, VS Code extension
- Graph explorer (packages/explorer), Plugin SDK
- ElectricSQL is the sync layer for team graphs

Team features are in separate packages — the core src/ remains OSS Apache 2.0.
Team sync, auth, and billing are in packages/team/ (Apache 2.0 with SSPL for cloud service).

Your task this session: [PICK ONE TASK from Phase 3 above and paste it here]

Non-negotiables:
- Solo local use must work identically without any team config or auth
- STRIPE_SECRET_KEY only in environment variables — never hardcoded
- Privacy: sync never transmits file contents or user prompts
- Test coverage required for all billing and auth flows

Success criteria: [from the task's Acceptance field above]
```

### Phase 3 Milestones
- [ ] ElectricSQL sync stable across 10 design partner teams
- [ ] Team dashboard live with per-engineer metrics
- [ ] Better Auth with GitHub + Google OAuth
- [ ] Stripe billing live with self-serve upgrade
- [ ] 10 paying teams ($10k MRR)
- [ ] 3 published case studies with real numbers
- [ ] Seed round closed (or actively in process)

---

## PHASE 4: ENTERPRISE + PROTOCOL GOVERNANCE
**Duration:** Month 8–18  
**Business goal:** 3 enterprise contracts. ECP v1.0 stable. Governance body in progress. Series A.  
**Code goal:** SAML, audit logs, on-prem deployment, ECP v1.0 spec freeze.

### Business Actions (Founder)

- [ ] **Enterprise sales motion** — land first 3 contracts via design partner referrals. Pricing: $X/seat/year with 50-seat minimum ($9k/year floor). Do not discount below this — it signals the product isn't enterprise-grade.
- [ ] **OpenJS Foundation sandbox application** — submit ECP for governance. This signals longevity to enterprise buyers. The application itself is press coverage.
- [ ] **ECP working group formation** — invite engineers from Continue, Cursor, Windsurf, and any other adopters to the working group. Meet monthly. Publish minutes publicly.
- [ ] **SOC 2 Type I** — begin the process. Takes 6 months. Enterprises need it. The audit log work in Phase 4 is preparation.
- [ ] **Analyst relations** — brief Redmonk, Sourcegraph blog, and relevant AI developer tooling analysts. They amplify to enterprise buyers.
- [ ] **Series A deck** — thesis: "The context layer of AI-assisted development. $100k ARR, 3 enterprise contracts, ECP adopted by 3 major tools, OpenJS Foundation governance in progress."

### Code Tasks (Give to Claude)

```
TASK 4.1 — SAML/SSO via Better Auth
Files:      src/auth/saml.ts (new), src/auth/scim.ts (new)
Package:    better-auth SAML plugin (check better-auth docs for SAML support)
Providers:  Okta, Azure AD, Google Workspace (the three enterprises use)
SCIM:       User provisioning/deprovisioning via SCIM 2.0 — enterprises require this
Config:     Enterprise admins configure via environment variables or config file
            Never store SAML certificates in code — always external config
Test:       Integration test with a SAML IdP test service (samltestidp.org)
Acceptance: SAML login flow completes. SCIM provisioning creates/deactivates users correctly.
```

```
TASK 4.2 — Audit log system
Files:      src/audit/logger.ts (new), src/audit/store.ts (new), src/audit/export.ts (new)
Events to log (with timestamp, actor, resource):
  - User login / logout
  - Graph index operation (which files, duration)
  - Team member invited / removed
  - Subscription change
  - ECP server started / stopped
  - Privacy invariant assertion (log when user prompt protection fires)
Storage:    .engram/audit.db (separate SQLite from graph.db — never mixed)
Retention:  90 days default, configurable
Export:     `engram audit export --format json --from 2026-01-01` → JSONL file
            `engram audit export --format csv` → CSV for compliance tools
Privacy:    Audit logs never contain user prompt content or file content
Acceptance: All events logged correctly. Export produces valid JSONL and CSV.
            Audit log SQLite is separate from graph — can be deleted without affecting graph.
```

```
TASK 4.3 — On-prem deployment package
Files:      docker/ (new directory), docker/docker-compose.yml, docker/Dockerfile
Components:
  - engram-server (Hono ECP server + team sync server)
  - electric-sync (ElectricSQL sync service)
  - postgres (Electric requires Postgres as backend — not SQLite in server mode)
Config:     docker-compose.yml with environment variable documentation
            One command: `docker compose up -d` → full team infrastructure running
No-internet: Entire stack runs air-gapped (no calls to external services)
Docs:       docs/on-prem.md — step-by-step deployment guide, tested on Ubuntu 22.04
Health:     docker-compose includes health checks for all services
Acceptance: `docker compose up -d` succeeds. Team features work against on-prem stack.
            On-prem guide is tested by a developer who has never seen the codebase.
```

```
TASK 4.4 — ECP v1.0 spec freeze and compliance suite v1.0
Files:      ecp-spec/v1.0/ (new directory, forked from v0.1 with RFC changes)
Changes from v0.1 (incorporate RFC feedback received during Phase 1–2):
  Common RFC categories to expect: additional node types, query language extensions,
  streaming responses for large graphs, batch query support, webhook notifications.
  Do not finalize v1.0 changes until RFC comment period closes and working group votes.
Stability guarantee: No breaking changes to v1.0 without 6-month deprecation period
Compliance suite: Bump ecp-compliance package to 1.0, add new v1.0 tests
Certification: Create process for ECP Certified badge — pass test suite + register
Docs:       ecp-spec/v1.0/README.md — migration guide from v0.1
Acceptance: ECP v1.0 spec document complete. Compliance suite passes for all registered tools.
```

### Claude Prompt — Phase 4 (Copy-Paste Ready)

```
Project: engram (github.com/NickCirv/engram)
Stack: TypeScript, Node.js 20+, React, graphology, sql.js (local), postgres (server),
       hono, electric-sql, better-auth, stripe, docker, vitest
Phase: 4 — Enterprise + Protocol Governance

Context:
Engram is a local-first codebase knowledge graph with:
- ECP protocol v0.1, adapters for 5 tools, VS Code extension
- Team sync via ElectricSQL, team dashboard, Better Auth (OAuth), Stripe billing
- 10+ paying teams, $10k MRR
- OpenJS Foundation governance application in progress

Enterprise features (SAML, audit logs, on-prem) extend the Team tier.
The ECP spec is being finalized based on 6 months of RFC feedback.

Your task this session: [PICK ONE TASK from Phase 4 above and paste it here]

Non-negotiables:
- On-prem must work fully air-gapped — zero external API calls
- Audit logs are append-only — never modify or delete log entries
- SAML certificates only in environment variables / config files — never in code
- ECP v1.0 breaking changes require 6-month deprecation period

Success criteria: [from the task's Acceptance field above]
```

### Phase 4 Milestones
- [ ] SAML/SSO with Okta + Azure AD tested and documented
- [ ] Audit log system live with JSON + CSV export
- [ ] On-prem Docker Compose package tested on Ubuntu 22.04
- [ ] ECP v1.0 stable spec published
- [ ] OpenJS Foundation sandbox application submitted
- [ ] 3 enterprise contracts signed ($27k+ ARR from enterprise alone)
- [ ] $100k total ARR
- [ ] Series A conversation underway

---

# PART IV: INVESTOR NARRATIVE
### The Seed Round Story

**The problem:** Five major AI coding tools — Claude Code, Cursor, Continue, Aider, Windsurf — are each independently solving context management. Each one is building a context layer from scratch. None of them has published a standard.

**The parallel:** In 2018, tree-sitter shipped. Within 3 years, every serious code editor had adopted it. Nobody builds their own parser anymore — tree-sitter is infrastructure. The same transition is about to happen for AI context management.

**What we're doing:** Defining the Engram Context Protocol — the standard for how AI coding tools manage, query, and persist codebase knowledge. The reference implementation (engram) is Apache 2.0 and always will be. We monetize through team sync ($15/seat/month) and enterprise compliance (custom). The protocol drives ubiquity. Ubiquity drives trust. Trust converts to revenue.

**Why now:** The window to define this standard is 12–18 months. After that, one of the existing tool companies does it, and it's their standard, not the community's. We have the technical lead (486 tests, 10 safety invariants, 82% token reduction with methodology), the early community, and the right open source model.

**What we're raising:** $[X] to ship ECP v1.0, sign 10 design partner teams, and reach $10k MRR within 9 months.

**Metrics:**
- 82% token reduction (reproducible, methodology-documented)
- 486 tests, 10 enforced safety invariants (production-grade from day one)
- Apache 2.0, local-first, zero cloud dependency (the enterprise trust signal)
- [X] GitHub stars, [Y] VS Code extension installs at raise time

**Target investors:** Boldstart (enterprise OSS thesis), a16z Infrastructure, Gradient Ventures (Google AI tools), OSS Capital (open source monetization specialists).

---

# APPENDIX: QUICK REFERENCE

## ECP Wire Format (v0.1)

```typescript
// What the PreToolUse:Read hook returns instead of file content
interface ECPResponse {
  ecp_version: '0.1'
  node: {
    id: string                    // "path/to/file.ts::SymbolName"
    type: 'function' | 'class' | 'module' | 'interface' | 'variable' | 'file'
    name: string
    path: string                  // relative, POSIX format always
    lines: [number, number]       // [startLine, endLine]
    confidence: number            // 0.0–1.0
    source: 'extracted' | 'inferred' | 'ambiguous'
    summary: string               // ≤300 tokens
    edges: Array<{
      to: string
      relation: 'calls' | 'imports' | 'extends' | 'uses'
    }>
    metadata: {
      churn_rate?: number
      last_modified?: string
      known_issues?: string[]
      decisions?: string[]
    }
  }
  tokens_saved: number            // tokens saved vs serving full file
  passthrough: false
}

// What the hook returns when it can't serve a summary
interface ECPPassthrough {
  ecp_version: '0.1'
  passthrough: true
  reason: 'low_confidence' | 'binary_file' | 'not_indexed' | 'server_unavailable'
}
```

## Key npm Packages by Phase

```
Phase 0: web-tree-sitter, oxc-parser, @ast-grep/napi, vectordb, @xenova/transformers, @biomejs/biome
Phase 1: hono, probot, @vscode/test-electron, ecp-compliance (publish this)
Phase 2: @xyflow/react, recharts
Phase 3: electric-sql, better-auth, stripe
Phase 4: (better-auth SAML plugin), docker (infra)
```

## File Creation Order (Critical Path)

```
Phase 0: src/miners/ast/treesitter.ts → src/miners/ast/oxc.ts → src/vector/ → src/embeddings/ → src/query/hybrid.ts → bench/
Phase 1: src/ecp/types.ts → src/server/index.ts (Hono) → src/adapters/ → packages/vscode/ → packages/github-app/
Phase 2: packages/explorer/ → src/plugins/sdk.ts → src/metrics/ → src/registry/
Phase 3: src/sync/electric.ts → src/org/ → packages/dashboard/ → src/auth/ → src/billing/
Phase 4: src/auth/saml.ts → src/audit/ → docker/ → ecp-spec/v1.0/
```

---

*End of document. Give Part III phases to Claude one at a time. Give Part II to the founder. Give Part IV to investors.*
