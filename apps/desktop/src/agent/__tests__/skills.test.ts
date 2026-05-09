import { describe, expect, it } from "vitest";

import {
  BUILTIN_SKILLS,
  createSkillRegistry,
  stripFrontmatter,
} from "../skills/registry";

describe("stripFrontmatter", () => {
  it("parses YAML frontmatter into key/value pairs", () => {
    const raw = `---
name: Diagram explainer
description: Generate one focused, color-coded diagram for a single concept.
icon: "1"
shortcut: '1'
---

# Body

Hello.
`;
    const out = stripFrontmatter(raw);
    expect(out.frontmatter.name).toBe("Diagram explainer");
    expect(out.frontmatter.description).toBe(
      "Generate one focused, color-coded diagram for a single concept.",
    );
    expect(out.frontmatter.icon).toBe("1");
    expect(out.frontmatter.shortcut).toBe("1");
    expect(out.body.trim().startsWith("# Body")).toBe(true);
  });

  it("returns input unchanged if no frontmatter", () => {
    const raw = "no frontmatter here\nplain markdown";
    const out = stripFrontmatter(raw);
    expect(out.frontmatter).toEqual({});
    expect(out.body).toBe(raw);
  });
});

describe("SkillRegistry (default loader, real files)", () => {
  it("lists all three built-in skills", async () => {
    const registry = createSkillRegistry();
    const list = await registry.list();
    expect(list.map((s) => s.id).sort()).toEqual(
      [...BUILTIN_SKILLS.map((s) => s.id)].sort(),
    );
  });

  it("loads each skill body with the frontmatter stripped", async () => {
    const registry = createSkillRegistry();
    for (const meta of BUILTIN_SKILLS) {
      const skill = await registry.get(meta.id);
      expect(skill).not.toBeNull();
      const body = await skill!.loadBody();
      expect(body.length).toBeGreaterThan(50);
      expect(body.startsWith("---")).toBe(false);
      expect(body).toMatch(/^#\s+/m); // body starts with a markdown heading
    }
  });

  it("returns null for unknown ids", async () => {
    const registry = createSkillRegistry();
    expect(await registry.get("does-not-exist")).toBeNull();
  });

  it("custom loader works (for the SPA / Tauri resource path case)", async () => {
    const registry = createSkillRegistry({
      manifests: [
        { id: "x", name: "X", description: "x", icon: "x", shortcut: "x" },
      ],
      load: async () => "---\nname: X\n---\n# Hello",
    });
    const skill = await registry.get("x");
    expect(skill).not.toBeNull();
    expect(await skill!.loadBody()).toBe("# Hello");
  });
});
