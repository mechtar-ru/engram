/**
 * MCP stdio server — exposes engram knowledge graph to Claude Code and other MCP clients.
 * Tools: query_graph, get_node, get_neighbors, god_nodes, graph_stats, shortest_path
 */
import { query, path, godNodes, stats, benchmark } from "./core.js";

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface McpRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

const PROJECT_ROOT = process.argv[2] || process.cwd();

const TOOLS: McpTool[] = [
  {
    name: "query_graph",
    description:
      "Search the knowledge graph using natural language. Returns relevant code structure as compact context.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Natural language question or keywords",
        },
        mode: {
          type: "string",
          enum: ["bfs", "dfs"],
          default: "bfs",
          description: "bfs=broad context, dfs=trace a specific path",
        },
        depth: {
          type: "integer",
          default: 3,
          description: "Traversal depth (1-6)",
        },
        token_budget: {
          type: "integer",
          default: 2000,
          description: "Max output tokens",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "god_nodes",
    description:
      "Return the most connected entities — the core abstractions of the codebase.",
    inputSchema: {
      type: "object",
      properties: {
        top_n: { type: "integer", default: 10 },
      },
    },
  },
  {
    name: "graph_stats",
    description:
      "Return summary: node/edge counts, confidence breakdown, token savings.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "shortest_path",
    description: "Find the shortest path between two concepts in the graph.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "Source concept label or keyword",
        },
        target: {
          type: "string",
          description: "Target concept label or keyword",
        },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "benchmark",
    description:
      "Compare token cost of graph queries vs reading raw files.",
    inputSchema: { type: "object", properties: {} },
  },
];

function handleToolCall(
  name: string,
  args: Record<string, unknown>
): string {
  switch (name) {
    case "query_graph": {
      const result = query(PROJECT_ROOT, args.question as string, {
        mode: (args.mode as "bfs" | "dfs") ?? "bfs",
        depth: (args.depth as number) ?? 3,
        tokenBudget: (args.token_budget as number) ?? 2000,
      });
      return `${result.nodesFound} nodes found (~${result.estimatedTokens} tokens)\n\n${result.text}`;
    }
    case "god_nodes": {
      const gods = godNodes(PROJECT_ROOT, (args.top_n as number) ?? 10);
      return gods
        .map(
          (g, i) =>
            `${i + 1}. ${g.label} [${g.kind}] — ${g.degree} edges (${g.sourceFile})`
        )
        .join("\n");
    }
    case "graph_stats": {
      const s = stats(PROJECT_ROOT);
      return [
        `Nodes: ${s.nodes}`,
        `Edges: ${s.edges}`,
        `EXTRACTED: ${s.extractedPct}%`,
        `INFERRED: ${s.inferredPct}%`,
        `AMBIGUOUS: ${s.ambiguousPct}%`,
      ].join("\n");
    }
    case "shortest_path": {
      const result = path(
        PROJECT_ROOT,
        args.source as string,
        args.target as string
      );
      return result.text;
    }
    case "benchmark": {
      const b = benchmark(PROJECT_ROOT);
      return [
        `Naive corpus: ~${b.naiveTokens.toLocaleString()} tokens`,
        `Avg graph query: ~${b.avgQueryTokens.toLocaleString()} tokens`,
        `Reduction: ${b.reductionRatio}x`,
        "",
        ...b.perQuestion.map(
          (pq) => `[${pq.reduction}x] ${pq.question}`
        ),
      ].join("\n");
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── MCP stdio protocol ──────────────────────────────────────────────────────

let buffer = "";

process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk: string) => {
  buffer += chunk;

  // MCP uses newline-delimited JSON
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req: McpRequest = JSON.parse(line);
      const res = handleRequest(req);
      process.stdout.write(JSON.stringify(res) + "\n");
    } catch {
      // skip malformed
    }
  }
});

function handleRequest(req: McpRequest): McpResponse {
  switch (req.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: req.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "engram", version: "0.1.0" },
        },
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: req.id,
        result: { tools: TOOLS },
      };

    case "tools/call": {
      const params = req.params as {
        name: string;
        arguments: Record<string, unknown>;
      };
      const text = handleToolCall(params.name, params.arguments ?? {});
      return {
        jsonrpc: "2.0",
        id: req.id,
        result: {
          content: [{ type: "text", text }],
        },
      };
    }

    default:
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: { code: -32601, message: `Unknown method: ${req.method}` },
      };
  }
}
