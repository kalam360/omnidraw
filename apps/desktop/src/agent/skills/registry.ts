/**
 * SkillRegistry — discovers `SKILL.md` files in `apps/desktop/src/agent/skills/`,
 * parses YAML frontmatter, exposes `list()` + `get(id)`.
 *
 * Path resolution caveat for v1 / v2:
 *
 * - In dev (Vite SPA / vitest), the skills live in source under
 *   `src/agent/skills/<id>/SKILL.md`. We resolve via `fileURLToPath` from
 *   `import.meta.url`.
 * - In a packaged Tauri app (S10), the skills move to the app's resource
 *   directory (`tauri::path::resource_dir()`). The registry will need to
 *   accept a base directory at construction time. The `BUILTIN_SKILLS`
 *   array stays the same; only the `loadBody()` resolver changes.
 *
 * To keep the v2 migration clean, all filesystem I/O goes through a
 * single `readSkillFile(id, fileName)` callback you can swap. Tests pass
 * a mock loader; Tauri will pass a resource-path resolver.
 */

import type { SkillManifest, SkillRegistry } from "../../contracts/skills";

/** Static metadata for the built-in skills. The `id` is the directory
 *  name under `skills/`. */
export const BUILTIN_SKILLS: ReadonlyArray<
  Omit<SkillManifest, "loadBody">
> = [
  {
    id: "diagram-explainer",
    name: "Diagram explainer",
    description:
      "Generate one focused, color-coded diagram for a single concept.",
    icon: "1",
    shortcut: "1",
  },
  {
    id: "scene-deck-builder",
    name: "Scene deck builder",
    description: "Build a sequence of N scenes for a topic — one at a time.",
    icon: "2",
    shortcut: "2",
  },
  {
    id: "refine-current-scene",
    name: "Refine current scene",
    description:
      "Read the current canvas and improve it in place — clean up, add a legend, reduce density.",
    icon: "3",
    shortcut: "3",
  },
] as const;

/** Loader contract: given a skill id, return the raw markdown body
 *  (without the frontmatter — the registry strips it). */
export type SkillBodyLoader = (id: string) => Promise<string>;

/** Strip `---\n...\n---\n` YAML frontmatter from raw markdown. */
export function stripFrontmatter(raw: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { frontmatter: {}, body: raw };
  const [, fmRaw, body] = m;
  const fm: Record<string, string> = {};
  for (const line of fmRaw.split(/\r?\n/)) {
    const mm = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (!mm) continue;
    const [, key, valRaw] = mm;
    let val = valRaw.trim();
    // Trim simple quoted strings
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

export interface CreateSkillRegistryOptions {
  /**
   * Custom skill list. Defaults to `BUILTIN_SKILLS`. Useful for tests.
   */
  manifests?: ReadonlyArray<Omit<SkillManifest, "loadBody">>;
  /**
   * Loader returning the *raw* SKILL.md content (with frontmatter).
   * Defaults to a Node `fs` loader that resolves
   * `<thisFileDir>/<id>/SKILL.md`. In the SPA build (Vite), the caller
   * should pass a Vite-glob-backed loader.
   */
  load?: (id: string) => Promise<string>;
}

/**
 * Default loader. Reads `SKILL.md` from the on-disk skill directory
 * relative to *this* source file. Works in vitest (where source lives
 * at `apps/desktop/src/agent/skills/`) and in Node-based Tauri sidecars
 * (until S10 migrates to resource paths).
 */
async function defaultLoad(id: string): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const url = await import("node:url");
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const skillFile = path.join(here, id, "SKILL.md");
  return fs.readFile(skillFile, "utf8");
}

class SkillRegistryImpl implements SkillRegistry {
  private readonly manifests: SkillManifest[];

  constructor(opts: CreateSkillRegistryOptions = {}) {
    const load = opts.load ?? defaultLoad;
    const list = opts.manifests ?? BUILTIN_SKILLS;
    this.manifests = list.map((meta) => ({
      ...meta,
      loadBody: async () => {
        const raw = await load(meta.id);
        return stripFrontmatter(raw).body.trim();
      },
    }));
  }

  async list(): Promise<SkillManifest[]> {
    return this.manifests;
  }

  async get(id: string): Promise<SkillManifest | null> {
    return this.manifests.find((s) => s.id === id) ?? null;
  }
}

/** Build a `SkillRegistry`. */
export function createSkillRegistry(
  opts: CreateSkillRegistryOptions = {},
): SkillRegistry {
  return new SkillRegistryImpl(opts);
}
