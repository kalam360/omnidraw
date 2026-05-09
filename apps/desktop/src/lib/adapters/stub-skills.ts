import type { SkillManifest, SkillRegistry } from "@/contracts";

const skills: SkillManifest[] = [
  {
    id: "no-skill",
    name: "No skill",
    description: "Plain conversation, no skill applied. Useful for brainstorming before drawing.",
    icon: "○",
    shortcut: "0",
    async loadBody() {
      return "";
    },
  },
  {
    id: "diagram-explainer",
    name: "Diagram explainer",
    description: "Generate teaching diagrams with labelled nodes and gradient arrows.",
    icon: "◰",
    shortcut: "1",
    async loadBody() {
      return "You are a diagramming assistant.";
    },
  },
  {
    id: "decomposition",
    name: "Decomposition",
    description: "Break a complex idea into ordered steps with side-by-side detail.",
    icon: "◇",
    shortcut: "2",
    async loadBody() {
      return "You decompose problems into smaller steps.";
    },
  },
  {
    id: "refine-canvas",
    name: "Refine canvas",
    description: "Read the current scene, propose targeted edits, ask before applying.",
    icon: "✎",
    shortcut: "3",
    async loadBody() {
      return "You refine existing diagrams.";
    },
  },
];

export const stubSkillRegistry: SkillRegistry = {
  async list() {
    return skills;
  },
  async get(id) {
    return skills.find((s) => s.id === id) ?? null;
  },
};
