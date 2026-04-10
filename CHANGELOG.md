# Changelog

All notable changes to engram are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-04-10

### Added

- **Skills miner** (`src/miners/skills-miner.ts`). Walks
  `~/.claude/skills/*/SKILL.md` (or a custom path) and indexes skills as
  graph nodes. Extracts trigger phrases via line-safe regex that survives
  `Node.js` / `React.js` style periods and Unicode curly quotes. Hand-rolled
  YAML parser — no new dependency. Handles anomalous files (missing
  frontmatter, corrupted YAML, broken symlinks) gracefully. Real-world
  benchmark: 140 skills + 2,690 keyword nodes indexed in 27ms.
- **Opt-in skills indexing** via `engram init --with-skills [dir]` or
  programmatic `init(root, { withSkills: true })`. Default is OFF —
  existing v0.1 users see no behavior change.
- **Adaptive `gen --task <name>`** driven by a data-driven `VIEWS` table.
  Four presets: `general` (default), `bug-fix`, `feature`, `refactor`.
  Each view specifies which sections render and at what limits. Adding a
  new task is adding a row to the VIEWS table — no branching logic.
- **Mistake memory activation** (regret buffer). The session miner
  already extracted mistakes in v0.1 — v0.2 wires them into the query
  path. Mistake nodes get a 2.5x score boost in `scoreNodes`, and matching
  mistakes are surfaced at the TOP of query output in a ⚠️ PAST MISTAKES
  warning block. Layering: promotion happens in scoring, presentation in
  rendering (per Hickey panel review guidance).
- **New `mistakes()` public API** in `src/core.ts` + `MistakeEntry`
  interface. Sorts by most-recently-verified, supports `limit` and
  `sinceDays` options.
- **New `engram mistakes` CLI command** with `-l/--limit`, `--since DAYS`,
  `-p/--project` flags.
- **New `list_mistakes` MCP tool** (6 tools total now). Explicit JSON
  Schema. Labels truncated surrogate-safely at 500 chars to prevent UTF-16
  corruption of the JSON-RPC response when mistakes contain emoji.
- **Atomic lockfile guard** on `init()` via `.engram/init.lock` (`wx`
  exclusive-create flag). Prevents two concurrent init calls from silently
  corrupting the graph. Descriptive error on contention.
- **Surrogate-safe string helpers** in new `src/graph/render-utils.ts`:
  `sliceGraphemeSafe()` and `truncateGraphemeSafe()`. Prevents lone high
  surrogates at cut boundaries that would corrupt JSON round-trip.
- **Data-driven View types** exported publicly: `View`, `SectionSpec`,
  `SectionKind`, `VIEWS`. Consumers can define custom views.
- **New EdgeRelation:** `triggered_by` (keyword concept → skill concept).
- **Integration guide updated** at `docs/INTEGRATION.md` with new
  `--with-skills`, `--task`, and `mistakes` sections.
- **Reference MCP shell wrapper** at `scripts/mcp-engram` (introduced in
  v0.1.1, documented in v0.2).

### Changed

- **`writeToFile` is now marker-state-aware** in `src/autogen.ts`. Walks
  the target file line-by-line tracking code-fence depth; markers inside
  fenced code blocks are correctly ignored. Unbalanced markers now throw
  a descriptive error instead of silently corrupting user content. This
  closes a v0.1 latent bug where CLAUDE.md files with orphaned markers
  could lose data between the orphaned pair.
- **`renderSubgraph` output uses surrogate-safe truncation** instead of
  raw `string.slice`. Emoji in mistake labels no longer corrupt the MCP
  JSON response.
- **`generateSummary(store)` signature** now accepts an optional
  `view: View` parameter; defaults to `VIEWS.general` for backwards
  compatibility. Legacy callers passing no view continue to work.
- **`autogen(root, target?)` signature** gained an optional third
  positional argument `task?: string`. Unknown task names throw with a
  descriptive error listing valid keys.
- **`init(root)` signature** now accepts optional `options: InitOptions`
  for `withSkills`. Unchanged default behavior.
- **`getGodNodes` SQL exclusion list** now includes `concept`. In v0.1
  this kind was unused; v0.2 uses it for skills and keywords, which
  should not dominate god-node results with hundreds of `triggered_by`
  edges.
- **MCP server numeric argument hardening.** All numeric tool args
  (`depth`, `token_budget`, `top_n`, `limit`, `since_days`) are now
  clamped via `clampInt()` with explicit min/max bounds. Prevents
  Infinity/NaN/negative values from DOSing the server on unbounded
  graph traversal or string construction.
- **MCP server error handling.** `handleRequest()` promise chain now
  has a `.catch()` that returns a generic `-32000` error response. Tool
  implementations that throw no longer produce unhandled rejections
  (which crash the process under Node's strict mode). Error messages
  from sql.js (which contain absolute filesystem paths) are never
  relayed to the client.
- **MCP server parse error response.** Malformed JSON on stdin now gets
  a proper JSON-RPC `-32700 Parse error` response with `id: null` per
  spec, instead of being silently dropped.
- **Engines requirement** remains `node >= 20` (unchanged from v0.1.1).

### Security

- **M1 (MCP unhandled rejection → process crash)** — fixed. See
  "Changed" above.
- **M2 (MCP numeric arg DOS)** — fixed. See "Changed" above.
- Both findings surfaced by the security-reviewer agent during the
  Phase 3 review gate.

### Tests

- **132 tests passing** (up from 63 in v0.1.1) across 8 test files.
- New test files: `tests/render-utils.test.ts` (13 tests),
  `tests/autogen.test.ts` (18 tests: writeToFile state machine + Views
  + autogen task flag), `tests/skills-miner.test.ts` (11 tests),
  `tests/mistake-memory.test.ts` (10 tests).
- New fixtures: `tests/fixtures/skills/{normal,anomaly,multiline,unicode,empty-body,corrupted}/SKILL.md`
  and `tests/fixtures/mistake-corpus-readme.md` (frozen README for
  false-positive regression).
- 8 new `tests/stress.test.ts` scenarios: v0.1 backwards compat,
  1000-node graph view performance, 100-mistake query, 200-mistake API
  slicing, MCP stdio smoke (list_tools + list_mistakes + parse error),
  MCP numeric arg hardening smoke, 2000-file + 100-skill init under 10s,
  empty-graph view rendering.

### Review gates

All 4 feature phases passed `code-reviewer` with APPROVED-WITH-NITS
verdicts; Phase 3 MCP boundary surface additionally passed
`security-reviewer`. Nits from reviewers are captured inline in commit
messages for follow-up tracking.

---

## [0.1.1] — 2026-04-09

### Added

- Published to npm as `engramx@0.1.1`.
- `engram-serve` bin alias for the MCP server binary.
- `engramx` bin alias matching the npm package name.
- Banner + social preview image.
- Comparison table vs Mem0, Graphify, aider, CLAUDE.md.
- GitHub Actions CI with Node 20 + 22 matrix.
- `docs/INTEGRATION.md` multi-machine setup guide.
- `scripts/mcp-engram` — portable reference shell wrapper.

### Changed

- Dropped Node 18 support — `vitest@4` requires `node:util.styleText`
  which is Node 20+.
- Removed `web-tree-sitter` dependency (was experimental, unused in
  v0.1; planned for v0.3).
- Package name from `engram` to `engramx` on npm after discovering
  the original name was taken by a dormant 2013 package.

---

## [0.1.0] — 2026-04-09

### Added

- Initial release. Knowledge graph for AI coding memory.
- **AST miner** — regex-based structural extraction across 10 languages
  (TypeScript, JavaScript, Python, Go, Rust, Java, C, C++, Ruby, PHP).
  Zero LLM cost, deterministic.
- **Git miner** — co-change pattern extraction from git log. Hot file
  detection (5+ changes).
- **Session miner** — decision/pattern/mistake extraction from CLAUDE.md,
  `.cursorrules`, AGENTS.md, and `.engram/sessions/` directories.
- **SQLite graph store** via `sql.js` — zero native dependencies.
- **CLI:** `init`, `query`, `path`, `gods`, `stats`, `bench`, `learn`,
  `gen`, `hooks`.
- **MCP stdio server** with 5 tools: `query_graph`, `god_nodes`,
  `graph_stats`, `shortest_path`, `benchmark`.
- **Auto-generated CLAUDE.md sections** via `engram gen`. Marker-scoped
  replacement.
- **Git hooks** — post-commit and post-checkout auto-rebuild in <50ms.
- **Confidence tagging** on every node and edge: EXTRACTED / INFERRED /
  AMBIGUOUS.
- **Honest benchmark** reporting two baselines: vs relevant files
  (3-11x) and vs full corpus (30-70x).
- Apache 2.0 licensed.

[0.2.0]: https://github.com/NickCirv/engram/releases/tag/v0.2.0
[0.1.1]: https://github.com/NickCirv/engram/releases/tag/v0.1.1
[0.1.0]: https://github.com/NickCirv/engram/releases/tag/v0.1.0
