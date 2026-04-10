/**
 * engram — AI coding memory that learns from every session.
 *
 * @packageDocumentation
 */
export {
  init,
  query,
  path,
  godNodes,
  stats,
  benchmark,
  learn,
  mistakes,
} from "./core.js";
export type { InitOptions, InitResult, MistakeEntry } from "./core.js";
export { install as installHooks, uninstall as uninstallHooks } from "./hooks.js";
export { autogen, generateSummary, VIEWS } from "./autogen.js";
export type { View, SectionSpec, SectionKind } from "./autogen.js";
export { mineSkills } from "./miners/skills-miner.js";
export type { SkillMineResult } from "./miners/skills-miner.js";
export { GraphStore } from "./graph/store.js";
export { queryGraph, shortestPath } from "./graph/query.js";
export { sliceGraphemeSafe, truncateGraphemeSafe } from "./graph/render-utils.js";
export { extractFile, extractDirectory, SUPPORTED_EXTENSIONS } from "./miners/ast-miner.js";
export type {
  Confidence,
  EdgeRelation,
  GraphEdge,
  GraphNode,
  GraphStats,
  NodeKind,
} from "./graph/schema.js";
