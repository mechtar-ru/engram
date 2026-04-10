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

engram ships a JSON-RPC stdio MCP server with 5 tools. Point Claude Code, Windsurf, or any MCP client at it:

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

Tools: `query_graph`, `god_nodes`, `graph_stats`, `shortest_path`, `benchmark`.

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
