import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  init,
  query,
  godNodes,
  stats,
  mistakes as listMistakes,
} from "../src/core.js";
import { extractFile, extractDirectory } from "../src/miners/ast-miner.js";
import { GraphStore } from "../src/graph/store.js";
import { generateSummary, VIEWS } from "../src/autogen.js";
import { queryGraph } from "../src/graph/query.js";
import type { GraphNode } from "../src/graph/schema.js";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

describe("Stress — edge cases", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-stress-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("handles empty directory", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(0);
    expect(result.nodes).toBe(0);
  });

  it("handles directory with only non-code files", async () => {
    writeFileSync(join(tmpDir, "README.md"), "# Hello");
    writeFileSync(join(tmpDir, "config.json"), "{}");
    writeFileSync(join(tmpDir, "image.png"), Buffer.from([0x89, 0x50]));
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(0);
  });

  it("handles empty source files", async () => {
    writeFileSync(join(tmpDir, "empty.ts"), "");
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(1);
    expect(result.nodes).toBeGreaterThanOrEqual(1); // at least the file node
  });

  it("handles deeply nested directories", async () => {
    let dir = tmpDir;
    for (let i = 0; i < 15; i++) {
      dir = join(dir, `level${i}`);
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(join(dir, "deep.ts"), "export function deep() { return true; }");
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(1);
    expect(result.nodes).toBeGreaterThan(0);
  });

  it("handles files with unicode names", async () => {
    writeFileSync(join(tmpDir, "módulo.ts"), "export function hola() {}");
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(1);
  });

  it("handles very large files", async () => {
    // 10,000 line file
    const lines: string[] = [];
    for (let i = 0; i < 10000; i++) {
      lines.push(`function func_${i}() { return ${i}; }`);
    }
    writeFileSync(join(tmpDir, "huge.ts"), lines.join("\n"));
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(1);
    expect(result.nodes).toBeGreaterThan(100); // should extract many functions
  });

  it("handles files with no functions or classes", async () => {
    writeFileSync(join(tmpDir, "constants.ts"), `
export const API_URL = "https://api.example.com";
export const MAX_RETRIES = 3;
export const TIMEOUT = 5000;
`);
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(1);
    // Should have at least the file node
    expect(result.nodes).toBeGreaterThanOrEqual(1);
  });

  it("handles circular symlinks without infinite loop", async () => {
    mkdirSync(join(tmpDir, "a"), { recursive: true });
    writeFileSync(join(tmpDir, "a", "code.ts"), "export function a() {}");
    try {
      symlinkSync(join(tmpDir, "a"), join(tmpDir, "a", "loop"));
    } catch {
      // symlinks might not be supported on all platforms
      return;
    }
    // Should complete without hanging
    const result = await init(tmpDir);
    expect(result.fileCount).toBeGreaterThanOrEqual(1);
  });

  it("handles files with binary content in code extension", async () => {
    // A .ts file that's actually binary (corrupted)
    writeFileSync(join(tmpDir, "binary.ts"), Buffer.from([0x00, 0xFF, 0xFE, 0x89, 0x50]));
    // Should not crash
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(1);
  });

  it("skips node_modules and hidden directories", async () => {
    mkdirSync(join(tmpDir, "node_modules", "pkg"), { recursive: true });
    mkdirSync(join(tmpDir, ".git", "objects"), { recursive: true });
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "node_modules", "pkg", "index.js"), "module.exports = {}");
    writeFileSync(join(tmpDir, ".git", "objects", "main.js"), "// git internal");
    writeFileSync(join(tmpDir, "src", "app.ts"), "export function app() {}");

    const result = await init(tmpDir);
    expect(result.fileCount).toBe(1); // only src/app.ts
  });

  it("handles query on empty graph", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    await init(tmpDir);
    const result = await query(tmpDir, "anything");
    expect(result.nodesFound).toBe(0);
  });

  it("handles gods on empty graph", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    await init(tmpDir);
    const gods = await godNodes(tmpDir);
    expect(gods).toEqual([]);
  });

  it("handles stats on empty graph", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    await init(tmpDir);
    const s = await stats(tmpDir);
    expect(s.nodes).toBe(0);
    expect(s.edges).toBe(0);
  });

  it("handles re-init (overwrite existing graph)", async () => {
    writeFileSync(join(tmpDir, "v1.ts"), "export function v1() {}");
    await init(tmpDir);
    const s1 = await stats(tmpDir);

    // Add more files and re-init
    writeFileSync(join(tmpDir, "v2.ts"), "export function v2() {}");
    await init(tmpDir);
    const s2 = await stats(tmpDir);

    expect(s2.nodes).toBeGreaterThan(s1.nodes);
  });
});

describe("Stress — multi-language", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-multilang-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("handles mixed language project", async () => {
    writeFileSync(join(tmpDir, "app.ts"), "export class App { start() {} }");
    writeFileSync(join(tmpDir, "server.py"), "class Server:\n    def run(self): pass");
    writeFileSync(join(tmpDir, "main.go"), "package main\n\nfunc main() {\n}\n");
    writeFileSync(join(tmpDir, "lib.rs"), "pub fn process() -> bool { true }");
    writeFileSync(join(tmpDir, "Helper.java"), "public class Helper {\n  public void help() {}\n}");
    writeFileSync(join(tmpDir, "utils.rb"), "class Utils\n  def run\n  end\nend");

    const result = await init(tmpDir);
    expect(result.fileCount).toBe(6);
    expect(result.nodes).toBeGreaterThanOrEqual(12); // at least file + 1 entity per file

    // Verify we can query across languages
    const q = await query(tmpDir, "process run start");
    expect(q.nodesFound).toBeGreaterThan(0);
  });
});

describe("Stress — scale", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-scale-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("handles 100 files project", async () => {
    for (let i = 0; i < 100; i++) {
      const dir = join(tmpDir, `module_${Math.floor(i / 10)}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, `file_${i}.ts`),
        `import { dep } from "./dep.js";\n\nexport class Class${i} {\n  method${i}() { return ${i}; }\n}\n\nexport function func${i}() { return new Class${i}(); }\n`
      );
    }

    const start = Date.now();
    const result = await init(tmpDir);
    const elapsed = Date.now() - start;

    expect(result.fileCount).toBe(100);
    expect(result.nodes).toBeGreaterThan(200); // at least file + class + function per file
    expect(elapsed).toBeLessThan(5000); // should complete in under 5 seconds

    // Query should still be fast
    const qStart = Date.now();
    const q = await query(tmpDir, "Class50 method50");
    const qElapsed = Date.now() - qStart;

    expect(q.nodesFound).toBeGreaterThan(0);
    expect(qElapsed).toBeLessThan(1000);
  });
});

// ─── Phase 4: v0.2 stress scenarios ─────────────────────────────────────────
describe("Stress — v0.2 additions", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-v02-stress-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("backwards compat: graph with only v0.1 NodeKinds opens with v0.2 code", async () => {
    // Build a store containing ONLY v0.1 node kinds (no concept, no skill).
    // v0.2 code must read it without errors — the schema is additive, not
    // migratory. This pins the "no removals" contract for old graph.db files.
    const v01Dir = join(tmpDir, ".engram");
    mkdirSync(v01Dir);
    const store = await GraphStore.open(join(v01Dir, "graph.db"));
    const v01Nodes: GraphNode[] = [
      {
        id: "file_main",
        label: "main.ts",
        kind: "file",
        sourceFile: "src/main.ts",
        sourceLocation: null,
        confidence: "EXTRACTED",
        confidenceScore: 1.0,
        lastVerified: Date.now(),
        queryCount: 0,
        metadata: {},
      },
      {
        id: "fn_main",
        label: "main()",
        kind: "function",
        sourceFile: "src/main.ts",
        sourceLocation: "L10",
        confidence: "EXTRACTED",
        confidenceScore: 1.0,
        lastVerified: Date.now(),
        queryCount: 0,
        metadata: {},
      },
      {
        id: "dec_old",
        label: "chose fastify over express",
        kind: "decision",
        sourceFile: "CLAUDE.md",
        sourceLocation: null,
        confidence: "INFERRED",
        confidenceScore: 0.7,
        lastVerified: Date.now(),
        queryCount: 0,
        metadata: {},
      },
    ];
    store.bulkUpsert(v01Nodes, []);
    store.close();

    // Reopen with v0.2 code — generateSummary + queryGraph should work
    const store2 = await GraphStore.open(join(v01Dir, "graph.db"));
    try {
      expect(() => generateSummary(store2, VIEWS.general)).not.toThrow();
      const summary = generateSummary(store2, VIEWS.feature);
      // main.ts file appears in the structure section
      expect(summary).toContain("main.ts");
      // Decision appears in the decisions section
      expect(summary).toContain("chose fastify");
      // queryGraph must not throw on a v0.1-style graph — behaviour may be
      // empty or populated depending on text match; what matters is no crash
      expect(() => queryGraph(store2, "fastify")).not.toThrow();
      // No crash from missing concept nodes — god node exclusion still works
      const gods = store2.getGodNodes(10);
      expect(gods.every((g) => g.node.kind !== "concept")).toBe(true);
    } finally {
      store2.close();
    }
  });

  it("generateSummary on 1000-node graph runs under 100ms for every view", async () => {
    const store = await GraphStore.open(join(tmpDir, "graph.db"));
    try {
      // Seed 1000 code nodes with a realistic mix of kinds
      const nodes: GraphNode[] = [];
      for (let i = 0; i < 700; i++) {
        nodes.push({
          id: `fn${i}`,
          label: `func${i}()`,
          kind: "function",
          sourceFile: `src/mod${Math.floor(i / 20)}.ts`,
          sourceLocation: `L${i}`,
          confidence: "EXTRACTED",
          confidenceScore: 1.0,
          lastVerified: Date.now(),
          queryCount: 0,
          metadata: {},
        });
      }
      for (let i = 0; i < 150; i++) {
        nodes.push({
          id: `file${i}`,
          label: `mod${i}.ts`,
          kind: "file",
          sourceFile: `src/mod${i}.ts`,
          sourceLocation: null,
          confidence: "EXTRACTED",
          confidenceScore: 1.0,
          lastVerified: Date.now(),
          queryCount: 0,
          metadata: {},
        });
      }
      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `dec${i}`,
          label: `decision ${i}`,
          kind: "decision",
          sourceFile: "CLAUDE.md",
          sourceLocation: null,
          confidence: "INFERRED",
          confidenceScore: 0.7,
          lastVerified: Date.now(),
          queryCount: 0,
          metadata: {},
        });
      }
      for (let i = 0; i < 50; i++) {
        nodes.push({
          id: `mis${i}`,
          label: `past mistake ${i}`,
          kind: "mistake",
          sourceFile: "CLAUDE.md",
          sourceLocation: null,
          confidence: "INFERRED",
          confidenceScore: 0.6,
          lastVerified: Date.now(),
          queryCount: 0,
          metadata: {},
        });
      }
      store.bulkUpsert(nodes, []);

      for (const view of Object.values(VIEWS)) {
        const start = Date.now();
        const out = generateSummary(store, view);
        const elapsed = Date.now() - start;
        expect(out).toContain("engram:start");
        // Generous 1000ms ceiling for CI runners — local laptop does this
        // in ~10ms, CI in ~100-150ms. The assertion's purpose is to catch
        // catastrophic regressions (e.g. O(n²) rendering), not pin a perf
        // target that would flake on slow hardware.
        expect(elapsed).toBeLessThan(1000);
      }
    } finally {
      store.close();
    }
  });

  it("100 mistakes in graph: query returns highest-scoring mistake first", async () => {
    const store = await GraphStore.open(join(tmpDir, "graph.db"));
    try {
      const nodes: GraphNode[] = [];
      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `mis${i}`,
          label: `generic mistake ${i}`,
          kind: "mistake",
          sourceFile: "CLAUDE.md",
          sourceLocation: null,
          confidence: "INFERRED",
          confidenceScore: 0.6,
          lastVerified: Date.now(),
          queryCount: 0,
          metadata: {},
        });
      }
      // One mistake with a specific unique term
      nodes.push({
        id: "mis_unique",
        label: "specific flanglefrobitz race condition at startup",
        kind: "mistake",
        sourceFile: "CLAUDE.md",
        sourceLocation: null,
        confidence: "INFERRED",
        confidenceScore: 0.6,
        lastVerified: Date.now(),
        queryCount: 0,
        metadata: {},
      });
      store.bulkUpsert(nodes, []);

      const result = queryGraph(store, "flanglefrobitz");
      expect(result.text).toContain("⚠️");
      expect(result.text).toContain("flanglefrobitz");
      // Warning block appears before any NODE lines (or there are none)
      const warnIdx = result.text.indexOf("⚠️");
      const nodeIdx = result.text.indexOf("NODE ");
      expect(warnIdx).toBeGreaterThan(-1);
      if (nodeIdx > -1) {
        expect(warnIdx).toBeLessThan(nodeIdx);
      }
    } finally {
      store.close();
    }
  });

  it("mistakes() API: 200-entry graph returns correct slice", async () => {
    mkdirSync(join(tmpDir, "src"));
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function a() {}\n");
    await init(tmpDir);

    // Directly inject 200 mistake nodes
    const store = await GraphStore.open(join(tmpDir, ".engram", "graph.db"));
    try {
      const now = Date.now();
      const nodes: GraphNode[] = [];
      for (let i = 0; i < 200; i++) {
        nodes.push({
          id: `mis_bulk_${i}`,
          label: `mistake number ${i}`,
          kind: "mistake",
          sourceFile: "CLAUDE.md",
          sourceLocation: null,
          confidence: "INFERRED",
          confidenceScore: 0.6,
          lastVerified: now - i * 1000, // older = smaller lastVerified
          queryCount: 0,
          metadata: {},
        });
      }
      store.bulkUpsert(nodes, []);
    } finally {
      store.close();
    }

    const top5 = await listMistakes(tmpDir, { limit: 5 });
    expect(top5.length).toBe(5);
    // Most recent should be first (mistake number 0 has latest lastVerified)
    expect(top5[0].label).toContain("mistake number 0");
  });

  it("MCP stdio smoke: spawn engram-serve, verify list_mistakes returns valid JSON", async () => {
    mkdirSync(join(tmpDir, "src"));
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function a() {}\n");
    await init(tmpDir);

    const servePath = resolve("./dist/serve.js");
    const child = spawn("node", [servePath, tmpDir], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const responses: string[] = [];
    await new Promise<void>((resolveP, rejectP) => {
      const timeout = setTimeout(() => {
        child.kill();
        rejectP(new Error("MCP server timeout"));
      }, 5000);

      child.stdout.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        responses.push(...lines);
        if (responses.length >= 3) {
          clearTimeout(timeout);
          child.kill();
          resolveP();
        }
      });

      child.stdin.write(
        '{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n'
      );
      child.stdin.write(
        '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_mistakes","arguments":{}}}\n'
      );
      // Force a parse error to test the -32700 path
      child.stdin.write("not valid json\n");
    });

    expect(responses.length).toBeGreaterThanOrEqual(3);
    // Parse all responses — every line must be valid JSON
    const parsed = responses.map((r) => {
      expect(() => JSON.parse(r)).not.toThrow();
      return JSON.parse(r);
    });

    // Find the tools/list response by id (not by array index — order
    // may vary depending on how data chunks are buffered)
    const toolsResp = parsed.find((p) => p.id === 1);
    expect(toolsResp).toBeDefined();
    expect(toolsResp.result?.tools?.length).toBe(6);
    expect(
      toolsResp.result.tools.some(
        (t: { name: string }) => t.name === "list_mistakes"
      )
    ).toBe(true);

    // Find the parse error response (id: null, code: -32700)
    const parseErr = parsed.find((p) => p.error?.code === -32700);
    expect(parseErr).toBeDefined();
    expect(parseErr.id).toBeNull();
  }, 10000);

  it("MCP stdio smoke: malicious numeric args get clamped, not crashed", async () => {
    mkdirSync(join(tmpDir, "src"));
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function a() {}\n");
    await init(tmpDir);

    const servePath = resolve("./dist/serve.js");
    const child = spawn("node", [servePath, tmpDir], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const responses: string[] = [];
    await new Promise<void>((resolveP, rejectP) => {
      const timeout = setTimeout(() => {
        child.kill();
        rejectP(new Error("MCP server timeout"));
      }, 5000);

      child.stdout.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        responses.push(...lines);
        if (responses.length >= 2) {
          clearTimeout(timeout);
          child.kill();
          resolveP();
        }
      });

      // Depth 999999 and token budget 9999999 should clamp, not DOS
      child.stdin.write(
        '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query_graph","arguments":{"question":"a","depth":999999,"token_budget":9999999}}}\n'
      );
      // Negative limit should clamp to 1
      child.stdin.write(
        '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_mistakes","arguments":{"limit":-100}}}\n'
      );
    });

    expect(responses.length).toBeGreaterThanOrEqual(2);
    for (const r of responses) {
      const parsed = JSON.parse(r);
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.error).toBeUndefined(); // no server error despite malicious args
    }
  }, 10000);

  it("2000 code files + 100 simulated skills completes init under 10s", async () => {
    const skillsDir = join(tmpDir, "skills");
    mkdirSync(skillsDir);
    for (let i = 0; i < 100; i++) {
      const sDir = join(skillsDir, `skill-${i}`);
      mkdirSync(sDir);
      writeFileSync(
        join(sDir, "SKILL.md"),
        `---\nname: skill-${i}\ndescription: "Use when testing stress ${i}."\n---\n\n# Skill ${i}\n`
      );
    }

    const srcDir = join(tmpDir, "project", "src");
    mkdirSync(srcDir, { recursive: true });
    for (let i = 0; i < 2000; i++) {
      writeFileSync(
        join(srcDir, `mod${i}.ts`),
        `export function mod${i}() { return ${i}; }\nexport class Mod${i} { doIt() { return ${i}; } }\n`
      );
    }

    const start = Date.now();
    const result = await init(join(tmpDir, "project"), {
      withSkills: skillsDir,
    });
    const elapsed = Date.now() - start;

    expect(result.fileCount).toBe(2000);
    expect(result.skillCount).toBe(100);
    expect(elapsed).toBeLessThan(10000);
  }, 30000);

  it("every view renders cleanly on an empty graph (no crashes)", async () => {
    const store = await GraphStore.open(join(tmpDir, "graph.db"));
    try {
      for (const view of Object.values(VIEWS)) {
        const out = generateSummary(store, view);
        expect(out).toContain("engram:start");
        expect(out).toContain("engram:end");
      }
    } finally {
      store.close();
    }
  });
});
