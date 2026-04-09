import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { init, query, godNodes, stats, benchmark, learn } from "../src/core.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Core — init", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-core-test-"));
    // Create a mini project
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "index.ts"),
      `import { helper } from "./helper.js";\n\nexport function main() {\n  return helper();\n}\n`
    );
    writeFileSync(
      join(tmpDir, "src", "helper.ts"),
      `export function helper() {\n  return "hello";\n}\n\nexport function unused() {\n  return null;\n}\n`
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates .engram directory and graph.db", async () => {
    const result = await init(tmpDir);
    expect(result.fileCount).toBe(2);
    expect(result.nodes).toBeGreaterThan(0);
    expect(result.edges).toBeGreaterThan(0);
    expect(result.timeMs).toBeGreaterThanOrEqual(0);
  });

  it("extracts functions from both files", async () => {
    await init(tmpDir);
    const gods = await godNodes(tmpDir);
    const labels = gods.map((g) => g.label);
    expect(labels).toContain("main()");
    expect(labels).toContain("helper()");
  });

  it("reports stats after init", async () => {
    await init(tmpDir);
    const s = await stats(tmpDir);
    expect(s.nodes).toBeGreaterThan(0);
    expect(s.edges).toBeGreaterThan(0);
    expect(s.lastMined).toBeGreaterThan(0);
  });
});

describe("Core — query", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-query-test-"));
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "auth.ts"),
      `export class AuthController {\n  async login(email: string) { return true; }\n  async logout() { return true; }\n}\n`
    );
    writeFileSync(
      join(tmpDir, "src", "db.ts"),
      `export class Database {\n  async connect() { return true; }\n  async query(sql: string) { return []; }\n}\n`
    );
    await init(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("finds matching nodes", async () => {
    const result = await query(tmpDir, "auth login");
    expect(result.nodesFound).toBeGreaterThan(0);
    expect(result.text).toContain("auth");
  });

  it("returns token estimate", async () => {
    const result = await query(tmpDir, "database");
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it("returns empty for no match", async () => {
    const result = await query(tmpDir, "zzzznonexistent");
    expect(result.nodesFound).toBe(0);
  });

  it("respects token budget", async () => {
    const small = await query(tmpDir, "auth", { tokenBudget: 50 });
    const large = await query(tmpDir, "auth", { tokenBudget: 5000 });
    expect(small.text.length).toBeLessThanOrEqual(large.text.length);
  });
});

describe("Core — benchmark", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-bench-test-"));
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "app.ts"), `export function app() { return "hello"; }\n`);
    await init(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports both baselines", async () => {
    const result = await benchmark(tmpDir);
    expect(result.naiveFullCorpus).toBeGreaterThan(0);
    expect(result.avgQueryTokens).toBeGreaterThanOrEqual(0);
  });
});

describe("Core — learn", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "engram-learn-test-"));
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "app.ts"), `export function app() {}\n`);
    await init(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("learns a pattern", async () => {
    const result = await learn(tmpDir, "pattern: always use immutable objects for state");
    expect(result.nodesAdded).toBeGreaterThanOrEqual(1);
  });

  it("learns a bug description", async () => {
    const result = await learn(tmpDir, "bug: race condition when multiple users connect simultaneously");
    expect(result.nodesAdded).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 for no extractable pattern", async () => {
    const result = await learn(tmpDir, "hello world");
    expect(result.nodesAdded).toBe(0);
  });
});
