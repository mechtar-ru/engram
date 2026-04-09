/**
 * Core engram operations — init, mine, query, stats.
 * This is the main API surface that CLI and MCP server both use.
 */
import { join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { GraphStore } from "./graph/store.js";
import { queryGraph, shortestPath } from "./graph/query.js";
import { extractDirectory } from "./miners/ast-miner.js";
import type { GraphStats } from "./graph/schema.js";

const ENGRAM_DIR = ".engram";
const DB_FILE = "graph.db";

export function getDbPath(projectRoot: string): string {
  return join(projectRoot, ENGRAM_DIR, DB_FILE);
}

export async function getStore(projectRoot: string): Promise<GraphStore> {
  return GraphStore.open(getDbPath(projectRoot));
}

export interface InitResult {
  nodes: number;
  edges: number;
  fileCount: number;
  totalLines: number;
  timeMs: number;
}

/**
 * Initialize engram for a project — scan codebase, build knowledge graph.
 * Zero LLM cost. Pure AST extraction.
 */
export async function init(projectRoot: string): Promise<InitResult> {
  const root = resolve(projectRoot);
  const start = Date.now();

  const engramDir = join(root, ENGRAM_DIR);
  mkdirSync(engramDir, { recursive: true });

  const { nodes, edges, fileCount, totalLines } = extractDirectory(root);

  const store = await getStore(root);
  store.clearAll();
  store.bulkUpsert(nodes, edges);
  store.setStat("last_mined", String(Date.now()));
  store.setStat("project_root", root);

  const timeMs = Date.now() - start;
  store.close();

  return { nodes: nodes.length, edges: edges.length, fileCount, totalLines, timeMs };
}

/**
 * Query the knowledge graph with natural language.
 */
export async function query(
  projectRoot: string,
  question: string,
  options: { mode?: "bfs" | "dfs"; depth?: number; tokenBudget?: number } = {}
): Promise<{ text: string; estimatedTokens: number; nodesFound: number }> {
  const store = await getStore(projectRoot);
  const result = queryGraph(store, question, options);
  store.close();
  return {
    text: result.text,
    estimatedTokens: result.estimatedTokens,
    nodesFound: result.nodes.length,
  };
}

/**
 * Find shortest path between two concepts.
 */
export async function path(
  projectRoot: string,
  source: string,
  target: string
): Promise<{ text: string; hops: number }> {
  const store = await getStore(projectRoot);
  const result = shortestPath(store, source, target);
  store.close();
  return { text: result.text, hops: result.edges.length };
}

/**
 * Get god nodes — most connected entities in the graph.
 */
export async function godNodes(
  projectRoot: string,
  topN = 10
): Promise<Array<{ label: string; kind: string; degree: number; sourceFile: string }>> {
  const store = await getStore(projectRoot);
  const gods = store.getGodNodes(topN);
  store.close();
  return gods.map((g) => ({
    label: g.node.label,
    kind: g.node.kind,
    degree: g.degree,
    sourceFile: g.node.sourceFile,
  }));
}

/**
 * Get graph stats.
 */
export async function stats(projectRoot: string): Promise<GraphStats> {
  const store = await getStore(projectRoot);
  const s = store.getStats();
  store.close();
  return s;
}

/**
 * Token reduction benchmark.
 */
export async function benchmark(
  projectRoot: string,
  questions?: string[]
): Promise<{
  naiveTokens: number;
  avgQueryTokens: number;
  reductionRatio: number;
  perQuestion: Array<{ question: string; tokens: number; reduction: number }>;
}> {
  const root = resolve(projectRoot);
  const store = await getStore(root);
  const allNodes = store.getAllNodes();

  let naiveChars = 0;
  const seenFiles = new Set<string>();
  for (const node of allNodes) {
    if (node.sourceFile && !seenFiles.has(node.sourceFile)) {
      seenFiles.add(node.sourceFile);
      try {
        const fullPath = join(root, node.sourceFile);
        if (existsSync(fullPath)) {
          naiveChars += readFileSync(fullPath, "utf-8").length;
        }
      } catch { /* skip */ }
    }
  }
  const naiveTokens = Math.ceil(naiveChars / 4);

  const qs = questions ?? [
    "how does authentication work",
    "what is the main entry point",
    "how are errors handled",
    "what connects the data layer to the api",
    "what are the core abstractions",
  ];

  const perQuestion: Array<{ question: string; tokens: number; reduction: number }> = [];
  for (const q of qs) {
    const result = queryGraph(store, q, { tokenBudget: 2000 });
    if (result.estimatedTokens > 0) {
      perQuestion.push({
        question: q,
        tokens: result.estimatedTokens,
        reduction: naiveTokens > 0
          ? Math.round((naiveTokens / result.estimatedTokens) * 10) / 10
          : 0,
      });
    }
  }

  store.close();

  const avgQueryTokens = perQuestion.length > 0
    ? Math.round(perQuestion.reduce((sum, p) => sum + p.tokens, 0) / perQuestion.length)
    : 0;

  return {
    naiveTokens,
    avgQueryTokens,
    reductionRatio: avgQueryTokens > 0 ? Math.round((naiveTokens / avgQueryTokens) * 10) / 10 : 0,
    perQuestion,
  };
}
