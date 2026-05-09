/** Read by the Agent team to drive Pi. Read by Frontend for the picker. */
export interface SkillManifest {
  id: string;             // e.g. "diagram-explainer"
  name: string;           // "Diagram explainer"
  description: string;    // shown in picker
  icon?: string;          // single character or emoji for the picker
  shortcut?: string;      // "1" .. "9" for the picker
  /** System prompt + behaviour rules. Loaded on demand. */
  loadBody(): Promise<string>;
}

export interface SkillRegistry {
  list(): Promise<SkillManifest[]>;
  get(id: string): Promise<SkillManifest | null>;
}
