/**
 * Graph query engine — BFS/DFS traversal, shortest path, subgraph extraction.
 * Operates on GraphStore and returns token-budgeted text context.
 */
import type { GraphStore } from "./store.js";
import type { GraphEdge, GraphNode } from "./schema.js";

const CHARS_PER_TOKEN = 4;

interface TraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  text: string;
  estimatedTokens: number;
}

function scoreNodes(
  store: GraphStore,
  terms: string[]
): Array<{ score: number; node: GraphNode }> {
  const allNodes = store.getAllNodes();
  const scored: Array<{ score: number; node: GraphNode }> = [];

  for (const node of allNodes) {
    const label = node.label.toLowerCase();
    const file = node.sourceFile.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (label.includes(t)) score += 2;
      if (file.includes(t)) score += 1;
    }
    if (score > 0) scored.push({ score, node });
  }

  return scored.sort((a, b) => b.score - a.score);
}

export function queryGraph(
  store: GraphStore,
  question: string,
  options: { mode?: "bfs" | "dfs"; depth?: number; tokenBudget?: number } = {}
): TraversalResult {
  const { mode = "bfs", depth = 3, tokenBudget = 2000 } = options;
  const terms = question
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = scoreNodes(store, terms);
  const startNodes = scored.slice(0, 3).map((s) => s.node);

  if (startNodes.length === 0) {
    return { nodes: [], edges: [], text: "No matching nodes found.", estimatedTokens: 5 };
  }

  // Increment query counts for matched nodes
  for (const n of startNodes) store.incrementQueryCount(n.id);

  const visited = new Set<string>(startNodes.map((n) => n.id));
  const collectedEdges: GraphEdge[] = [];

  if (mode === "bfs") {
    let frontier = new Set(startNodes.map((n) => n.id));
    for (let d = 0; d < depth; d++) {
      const nextFrontier = new Set<string>();
      for (const nid of frontier) {
        const neighbors = store.getNeighbors(nid);
        for (const { node, edge } of neighbors) {
          if (!visited.has(node.id)) {
            nextFrontier.add(node.id);
            collectedEdges.push(edge);
          }
        }
      }
      for (const id of nextFrontier) visited.add(id);
      frontier = nextFrontier;
    }
  } else {
    const stack: Array<{ id: string; d: number }> = startNodes
      .map((n) => ({ id: n.id, d: 0 }))
      .reverse();
    while (stack.length > 0) {
      const { id, d } = stack.pop()!;
      if (d > depth) continue;
      const neighbors = store.getNeighbors(id);
      for (const { node, edge } of neighbors) {
        if (!visited.has(node.id)) {
          visited.add(node.id);
          stack.push({ id: node.id, d: d + 1 });
          collectedEdges.push(edge);
        }
      }
    }
  }

  // Collect all visited nodes
  const resultNodes: GraphNode[] = [];
  for (const id of visited) {
    const node = store.getNode(id);
    if (node) resultNodes.push(node);
  }

  // Render as text with token budget
  const text = renderSubgraph(resultNodes, collectedEdges, tokenBudget);
  const estimatedTokens = Math.ceil(text.length / CHARS_PER_TOKEN);

  return { nodes: resultNodes, edges: collectedEdges, text, estimatedTokens };
}

export function shortestPath(
  store: GraphStore,
  sourceTerm: string,
  targetTerm: string,
  maxHops = 8
): TraversalResult {
  const sourceTerms = sourceTerm.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const targetTerms = targetTerm.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const sourceScored = scoreNodes(store, sourceTerms);
  const targetScored = scoreNodes(store, targetTerms);

  if (sourceScored.length === 0 || targetScored.length === 0) {
    return {
      nodes: [],
      edges: [],
      text: `No nodes matching "${sourceTerm}" or "${targetTerm}".`,
      estimatedTokens: 10,
    };
  }

  const srcId = sourceScored[0].node.id;
  const tgtId = targetScored[0].node.id;

  // BFS shortest path
  const queue: string[][] = [[srcId]];
  const seen = new Set<string>([srcId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === tgtId) {
      // Build result from path
      const pathNodes: GraphNode[] = [];
      const pathEdges: GraphEdge[] = [];
      for (let i = 0; i < path.length; i++) {
        const node = store.getNode(path[i]);
        if (node) pathNodes.push(node);
        if (i < path.length - 1) {
          const neighbors = store.getNeighbors(path[i]);
          const edge = neighbors.find((n) => n.node.id === path[i + 1])?.edge;
          if (edge) pathEdges.push(edge);
        }
      }
      const text = renderPath(pathNodes, pathEdges);
      return {
        nodes: pathNodes,
        edges: pathEdges,
        text,
        estimatedTokens: Math.ceil(text.length / CHARS_PER_TOKEN),
      };
    }

    if (path.length > maxHops) continue;

    const neighbors = store.getNeighbors(current);
    for (const { node } of neighbors) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        queue.push([...path, node.id]);
      }
    }
  }

  return {
    nodes: [],
    edges: [],
    text: `No path found between "${sourceTerm}" and "${targetTerm}" within ${maxHops} hops.`,
    estimatedTokens: 15,
  };
}

function renderSubgraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  tokenBudget: number
): string {
  const charBudget = tokenBudget * CHARS_PER_TOKEN;
  const lines: string[] = [];

  // Sort nodes by degree (most connected first)
  const degreeMap = new Map<string, number>();
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
  }
  const sorted = [...nodes].sort(
    (a, b) => (degreeMap.get(b.id) ?? 0) - (degreeMap.get(a.id) ?? 0)
  );

  for (const n of sorted) {
    lines.push(
      `NODE ${n.label} [${n.kind}] src=${n.sourceFile} ${n.sourceLocation ?? ""}`
    );
  }

  for (const e of edges) {
    const srcNode = nodes.find((n) => n.id === e.source);
    const tgtNode = nodes.find((n) => n.id === e.target);
    if (srcNode && tgtNode) {
      const conf =
        e.confidence === "EXTRACTED"
          ? ""
          : ` [${e.confidence} ${e.confidenceScore}]`;
      lines.push(
        `EDGE ${srcNode.label} --${e.relation}--> ${tgtNode.label}${conf}`
      );
    }
  }

  let output = lines.join("\n");
  if (output.length > charBudget) {
    output =
      output.slice(0, charBudget) +
      `\n... (truncated to ~${tokenBudget} token budget)`;
  }
  return output;
}

function renderPath(nodes: GraphNode[], edges: GraphEdge[]): string {
  if (nodes.length === 0) return "Empty path.";
  const segments: string[] = [nodes[0].label];
  for (let i = 0; i < edges.length; i++) {
    const conf =
      edges[i].confidence === "EXTRACTED"
        ? ""
        : ` [${edges[i].confidence}]`;
    segments.push(`--${edges[i].relation}${conf}--> ${nodes[i + 1]?.label ?? "?"}`);
  }
  return `Path (${edges.length} hops): ${segments.join(" ")}`;
}
