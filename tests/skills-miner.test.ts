import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mineSkills } from "../src/miners/skills-miner.js";

const FIXTURES = join(__dirname, "fixtures", "skills");

function findSkillNode(nodes: any[], name: string) {
  return nodes.find(
    (n) => n.kind === "concept" && n.metadata?.subkind === "skill" && n.label === name
  );
}

function findKeywordNodes(nodes: any[]) {
  return nodes.filter((n) => n.kind === "concept" && n.metadata?.subkind === "keyword");
}

function findEdge(edges: any[], source: string, relation: string) {
  return edges.find((e) => e.source === source && e.relation === relation);
}

describe("skills-miner: frozen fixtures", () => {
  it("skills dir that doesn't exist → empty result, no error", () => {
    const result = mineSkills("/definitely/does/not/exist/skills");
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.skillCount).toBe(0);
    expect(result.anomalies).toEqual([]);
  });

  it("normal SKILL.md → skill node + keyword nodes + triggered_by edges", () => {
    const single = mkdtempSync(join(tmpdir(), "engram-skills-"));
    try {
      mkdirSync(join(single, "copywriting"));
      writeFileSync(
        join(single, "copywriting", "SKILL.md"),
        require("node:fs").readFileSync(join(FIXTURES, "normal", "SKILL.md"), "utf-8")
      );
      const result = mineSkills(single);
      expect(result.skillCount).toBe(1);
      const skill = findSkillNode(result.nodes, "copywriting");
      expect(skill).toBeDefined();
      expect(skill.metadata.hasFrontmatter).toBe(true);
      expect(skill.metadata.version).toBe("2.0.0");
      expect(skill.confidence).toBe("EXTRACTED");

      // Keywords should include the quoted triggers + Use when phrase
      const keywords = findKeywordNodes(result.nodes);
      const labels = keywords.map((k) => k.label.toLowerCase());
      expect(labels.some((l) => l.includes("write copy for"))).toBe(true);
      expect(labels.some((l) => l.includes("improve this copy"))).toBe(true);

      // At least one triggered_by edge pointing at the skill
      const edges = result.edges.filter(
        (e) => e.relation === "triggered_by" && e.target === skill.id
      );
      expect(edges.length).toBeGreaterThan(0);
    } finally {
      rmSync(single, { recursive: true, force: true });
    }
  });

  it("anomaly SKILL.md (no frontmatter) → parses name from first heading, hasFrontmatter=false", () => {
    const single = mkdtempSync(join(tmpdir(), "engram-skills-"));
    try {
      mkdirSync(join(single, "reddit-api-poster"));
      writeFileSync(
        join(single, "reddit-api-poster", "SKILL.md"),
        require("node:fs").readFileSync(join(FIXTURES, "anomaly", "SKILL.md"), "utf-8")
      );
      const result = mineSkills(single);
      expect(result.skillCount).toBe(1);
      expect(result.anomalies.length).toBe(1);
      const skill = result.nodes.find(
        (n: any) => n.kind === "concept" && n.metadata?.subkind === "skill"
      );
      expect(skill).toBeDefined();
      expect(skill.metadata.hasFrontmatter).toBe(false);
      expect(skill.label.toLowerCase()).toContain("reddit");
    } finally {
      rmSync(single, { recursive: true, force: true });
    }
  });

  it("multiline YAML '>' description → joined and triggers extracted including Node.js", () => {
    const single = mkdtempSync(join(tmpdir(), "engram-skills-"));
    try {
      mkdirSync(join(single, "nodejs-backend-patterns"));
      writeFileSync(
        join(single, "nodejs-backend-patterns", "SKILL.md"),
        require("node:fs").readFileSync(join(FIXTURES, "multiline", "SKILL.md"), "utf-8")
      );
      const result = mineSkills(single);
      const skill = findSkillNode(result.nodes, "nodejs-backend-patterns");
      expect(skill).toBeDefined();
      // The multiline description should be joined into a single string
      expect(skill.metadata.description).toContain("Node.js");
      // CRITICAL Knuth regression: "building Node.js backends" must not be
      // truncated at the period in ".js"
      const keywordLabels = findKeywordNodes(result.nodes).map((k) =>
        k.label.toLowerCase()
      );
      const hasFullPhrase = keywordLabels.some(
        (l) => l.includes("node.js") || l.includes("node.js backends")
      );
      expect(hasFullPhrase).toBe(true);
    } finally {
      rmSync(single, { recursive: true, force: true });
    }
  });

  it("unicode curly quotes in triggers → extracted correctly", () => {
    const single = mkdtempSync(join(tmpdir(), "engram-skills-"));
    try {
      mkdirSync(join(single, "content-strategy"));
      writeFileSync(
        join(single, "content-strategy", "SKILL.md"),
        require("node:fs").readFileSync(join(FIXTURES, "unicode", "SKILL.md"), "utf-8")
      );
      const result = mineSkills(single);
      expect(result.skillCount).toBe(1);
      const keywords = findKeywordNodes(result.nodes).map((k) => k.label.toLowerCase());
      // Curly-quoted triggers "content strategy" and 'editorial calendar'
      expect(keywords.some((k) => k.includes("content strategy"))).toBe(true);
      expect(keywords.some((k) => k.includes("editorial calendar"))).toBe(true);
      // Straight-quoted "content audit"
      expect(keywords.some((k) => k.includes("content audit"))).toBe(true);
    } finally {
      rmSync(single, { recursive: true, force: true });
    }
  });

  it("corrupted YAML → degrades to anomaly or skips, no crash", () => {
    const single = mkdtempSync(join(tmpdir(), "engram-skills-"));
    try {
      mkdirSync(join(single, "broken"));
      writeFileSync(
        join(single, "broken", "SKILL.md"),
        require("node:fs").readFileSync(join(FIXTURES, "corrupted", "SKILL.md"), "utf-8")
      );
      // Must not throw
      expect(() => mineSkills(single)).not.toThrow();
      const result = mineSkills(single);
      // Either parsed as anomaly OR skipped entirely — both are acceptable.
      // What's NOT acceptable: a crash or garbage output.
      expect(result.skillCount).toBeGreaterThanOrEqual(0);
      expect(result.skillCount).toBeLessThanOrEqual(1);
    } finally {
      rmSync(single, { recursive: true, force: true });
    }
  });

  it("empty body (frontmatter only) → skill node with empty triggers, no crash", () => {
    const single = mkdtempSync(join(tmpdir(), "engram-skills-"));
    try {
      mkdirSync(join(single, "placeholder"));
      writeFileSync(
        join(single, "placeholder", "SKILL.md"),
        require("node:fs").readFileSync(join(FIXTURES, "empty-body", "SKILL.md"), "utf-8")
      );
      const result = mineSkills(single);
      expect(result.skillCount).toBe(1);
      const skill = result.nodes.find(
        (n: any) => n.metadata?.subkind === "skill"
      );
      expect(skill).toBeDefined();
      expect(skill.metadata.description).toContain("Placeholder");
    } finally {
      rmSync(single, { recursive: true, force: true });
    }
  });
});

describe("skills-miner: dynamic scenarios", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "engram-skills-dyn-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("500-skill directory completes under 2 seconds", () => {
    for (let i = 0; i < 500; i++) {
      const skillDir = join(dir, `skill-${i}`);
      mkdirSync(skillDir);
      writeFileSync(
        join(skillDir, "SKILL.md"),
        `---\nname: skill-${i}\ndescription: "Use when doing task ${i}. Triggers: 'task ${i}'."\n---\n\n# Skill ${i}\n`
      );
    }
    const start = Date.now();
    const result = mineSkills(dir);
    const elapsed = Date.now() - start;
    expect(result.skillCount).toBe(500);
    expect(elapsed).toBeLessThan(2000);
  });

  it("broken symlink → logged and skipped, no crash", () => {
    mkdirSync(join(dir, "real"));
    writeFileSync(
      join(dir, "real", "SKILL.md"),
      `---\nname: real\ndescription: "Use when testing real."\n---\n\n# Real\n`
    );
    // Create a symlink pointing to a path that doesn't exist
    try {
      symlinkSync("/tmp/this-does-not-exist-zzz", join(dir, "broken-link"));
    } catch {
      // Platform doesn't allow symlinks — skip this test gracefully
      return;
    }
    expect(() => mineSkills(dir)).not.toThrow();
    const result = mineSkills(dir);
    // The real skill should still be found; broken symlink silently skipped
    expect(result.skillCount).toBe(1);
  });

  it("Related Skills section → creates similar_to edges between skills", () => {
    mkdirSync(join(dir, "skill-a"));
    mkdirSync(join(dir, "skill-b"));
    mkdirSync(join(dir, "skill-c"));
    writeFileSync(
      join(dir, "skill-a", "SKILL.md"),
      `---\nname: skill-a\ndescription: "Use when testing A."\n---\n\n# Skill A\n\n## Related Skills\n\n- \`skill-b\`\n- \`skill-c\`\n`
    );
    writeFileSync(
      join(dir, "skill-b", "SKILL.md"),
      `---\nname: skill-b\ndescription: "Use when testing B."\n---\n\n# Skill B\n`
    );
    writeFileSync(
      join(dir, "skill-c", "SKILL.md"),
      `---\nname: skill-c\ndescription: "Use when testing C."\n---\n\n# Skill C\n`
    );
    const result = mineSkills(dir);
    expect(result.skillCount).toBe(3);
    const similarEdges = result.edges.filter((e) => e.relation === "similar_to");
    expect(similarEdges.length).toBe(2);
    const skillA = findSkillNode(result.nodes, "skill-a");
    expect(similarEdges.every((e) => e.source === skillA.id)).toBe(true);
  });

  it("sorted order is deterministic across runs (case-insensitive FS stability)", () => {
    // Create multiple skills; verify deterministic order across invocations
    for (const name of ["zebra", "apple", "mango", "banana"]) {
      mkdirSync(join(dir, name));
      writeFileSync(
        join(dir, name, "SKILL.md"),
        `---\nname: ${name}\ndescription: "Use when testing ${name}."\n---\n\n# ${name}\n`
      );
    }
    const run1 = mineSkills(dir);
    const run2 = mineSkills(dir);
    const run1Skills = run1.nodes
      .filter((n: any) => n.metadata?.subkind === "skill")
      .map((n: any) => n.label);
    const run2Skills = run2.nodes
      .filter((n: any) => n.metadata?.subkind === "skill")
      .map((n: any) => n.label);
    expect(run1Skills).toEqual(run2Skills);
    // And the order should be sorted alphabetically
    expect(run1Skills).toEqual([...run1Skills].sort());
  });
});
