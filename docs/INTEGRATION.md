# Integration Guide

How to wire engram into a real AI coding workflow across one or more machines.

---

## The Three Ways to Call engram

engram exposes three interfaces. Pick whichever matches your agent stack.

### 1. Direct CLI (simplest)

```bash
engram init ~/myrepo
engram query "how does auth work" -p ~/myrepo
engram gods -p ~/myrepo
engram stats -p ~/myrepo
```

Good for: manual use, shell scripts, CI pipelines.

### 2. MCP Server (for MCP-aware clients)

engram ships a JSON-RPC stdio MCP server with 6 tools. Point Claude Code, Windsurf, or any MCP client at it:

```json
{
  "mcpServers": {
    "engram": {
      "command": "engram-serve",
      "args": ["/path/to/your/project"]
    }
  }
}
```

Tools: `query_graph`, `god_nodes`, `graph_stats`, `shortest_path`, `benchmark`, `list_mistakes` (v0.2).

One MCP server instance per project — the project path is baked into `args`. If you work across many projects, option 3 is cheaper.

### 3. Shell Wrapper (for cross-project, T1-cost access)

If you want one command that works across every project without registering a separate MCP server per repo, use the reference wrapper at [`scripts/mcp-engram`](../scripts/mcp-engram):

```bash
# Install the wrapper
cp scripts/mcp-engram ~/bin/mcp-engram
chmod +x ~/bin/mcp-engram

# Use it from anywhere
mcp-engram query "how does auth work" -p ~/myrepo
mcp-engram stats -p ~/other-repo
mcp-engram gods -p ~/third-repo
```

The wrapper is portable — it prefers the globally-installed `engram` binary (`npm install -g engramx`) and falls back to a local source checkout if you're hacking on engram itself.

**Why this matters:** in a Bash-based agent loop (Claude Code, aider, custom pipelines), a shell command costs ~100-500 tokens per call. Starting a JSON-RPC MCP server for every project you touch is more context overhead. The wrapper lets one command handle N projects via `-p <path>`.

---

## Multi-Machine Setup

If your dev workflow spans a laptop and a remote box (server, dev container, homelab), install engram on both:

```bash
# On each machine
npm install -g engramx
cp scripts/mcp-engram ~/bin/mcp-engram  # optional
chmod +x ~/bin/mcp-engram               # optional
```

The graph lives in `.engram/graph.db` inside each project. If your project directory is shared (NFS, rsync, vault mount, bind mount), the graph is automatically visible on both machines — `engram query` on the remote reads the same graph the laptop wrote.

**Caveat:** SQLite doesn't love concurrent writers across machines. Pick one machine as the mining host (usually wherever `git commit` runs) and let the other machine read-only query the graph. engram's git hooks install on whichever machine you run `engram hooks install` on.

---

## Auto-Generated AI Instructions

After `engram init`, run `engram gen` to write a structured summary into your AI config file:

```bash
engram gen --target claude     # CLAUDE.md
engram gen --target cursor     # .cursorrules
engram gen --target agents     # AGENTS.md
```

The generated section is delimited by `<!-- engram:start -->` / `<!-- engram:end -->` markers, so you can keep your own hand-written guidance above or below the auto-gen block and engram will only replace the delimited region on re-runs.

This is the cheapest integration point: the structural summary loads into your AI's preload context on every session start, so even if the agent never calls engram directly, it benefits from the graph.

### Task-Aware Views (v0.2)

`engram gen --task <name>` writes a different slice of the graph depending on what you're about to do:

```bash
engram gen --task bug-fix     # leads with 🔥 hot files + ⚠️ past mistakes
engram gen --task feature     # leads with god nodes + decisions + deps
engram gen --task refactor    # leads with god nodes + dependency graph + patterns
engram gen --task general     # balanced (default)
```

Under the hood this is a data table (`VIEWS` in `src/autogen.ts`) — each row specifies which sections to include and at what limits. Adding a custom view is adding a row, not editing code.

## Indexing Claude Code Skills (v0.2)

If you use Claude Code with its `~/.claude/skills/` directory, you can index those skills directly into your project's graph so queries return both the relevant code *and* the skill to apply:

```bash
engram init ~/myrepo --with-skills           # default: ~/.claude/skills/
engram init ~/myrepo --with-skills ~/other-skills  # custom path
```

Skills become `concept` nodes with `metadata.subkind = "skill"`. Trigger phrases extracted from each `SKILL.md` description become separate `concept` keyword nodes, linked via the `triggered_by` edge relation. A query hitting a keyword node naturally walks the edge to the skill during BFS traversal — no new query code needed.

**Opt-in, default OFF.** Users without a skills directory see zero behavior change.

## Mistake Memory (v0.2)

The session miner extracts mistakes from `CLAUDE.md` / `.cursorrules` / `.engram/sessions/` files (look for patterns like `bug: <description>` or `fix: <description>`). v0.2 promotes these to the TOP of query output in a `⚠️ PAST MISTAKES` warning block whenever a query matches.

```bash
engram mistakes                       # list all known mistakes
engram mistakes --limit 10
engram mistakes --since 30            # only mistakes verified in the last 30 days
engram learn "bug: fs.readFile in event loop stalled prod"   # manually log one
```

Via MCP, Claude Code can call the `list_mistakes` tool to get the same data.

**What the session miner does NOT match:** prose. The regex requires explicit colon-delimited markers (`bug: X`, `fix: X`, `pattern: X`). This keeps the false-positive rate at zero on prose documentation — we verified this against the engram README as a pinned regression test.

---

## Git Hooks (Keep the Graph Fresh)

```bash
engram hooks install -p ~/myrepo
```

Installs `post-commit` and `post-checkout` hooks that re-run the AST miner in <50ms after every commit or branch switch. Zero tokens, no LLM.

```bash
engram hooks status       # Check which hooks are installed
engram hooks uninstall    # Remove
```

---

## Integrating with a Rules File

If you run a rules-based agent stack (e.g. Claude Code with global rules), add engram as a pre-dispatch step:

> **Before reading code files:** check whether `.engram/graph.db` exists in the project. If yes, run `mcp-engram query "<keywords>" -p <path>` first. The graph returns a ~300 token structural summary instead of forcing a multi-file read (~3,000+ tokens).

This single rule flips engram from "tool you remember to use" into "tool that saves tokens on every code-navigation task."

---

## Verifying the Integration

```bash
# Is engram installed and on PATH?
which engram && engram --help | head -5

# Is the wrapper resolving correctly?
mcp-engram --which

# Do we have graphs on disk?
find ~ -name ".engram" -type d 2>/dev/null

# Pick a project and show stats
mcp-engram stats -p ~/myrepo
```

If `Last mined` is fresh (<24h) and node/edge counts look reasonable for the codebase size, you're integrated.

---

## Common Gotchas

| Problem | Fix |
|---------|-----|
| `engram not found` after install | Make sure your global npm bin is on PATH: `npm config get prefix`, then add `<prefix>/bin` to `$PATH`. |
| Wrapper points to wrong binary on remote machine | Run `mcp-engram --which` to see what it resolved to. Update `scripts/mcp-engram` fallback path if needed. |
| `engram init` reports 0 files | The directory contains no supported source files. engram skips `node_modules`, `dist`, `.git`, and binary files. Verify with `find <path> -type f -name "*.ts"`. |
| Graph stays stale | Install git hooks (`engram hooks install -p <path>`) or re-run `engram init` in CI. |
| Cross-machine write conflicts | Only one machine should run `engram init` or have git hooks. Others should query only. |
| `Another engram init is running (lock: ...)` | v0.2 lockfile guard. If no other process is actually running, `rm .engram/init.lock` to clear the stale lock. |
| `cannot safely update CLAUDE.md: Found N start / M end marker(s)` | Your CLAUDE.md has unbalanced engram markers (usually from a manual edit). Fix them by hand and re-run. |
| Skills-miner misses triggers in my `SKILL.md` | Check the description field. Triggers must be either (a) quoted strings (any Unicode quote), or (b) `Use when X` patterns. Sentence-boundary parsing survives periods inside identifiers like `Node.js`. |
