import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { init, query, godNodes, stats } from "../src/core.js";
import { extractFile, extractDirectory } from "../src/miners/ast-miner.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
