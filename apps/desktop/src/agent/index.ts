/**
 * Public surface of the Agent module. Frontend imports from here.
 *
 * `createAgent()` is the high-level factory the spec calls out: it
 * wires the Pi `Agent`, the `OmnidrawChatAdapter` (assistant-ui
 * runtime side), the `SkillRegistry`, and the `AuthAdapter` together.
 */

import { OmnidrawChatAdapter } from "./adapter";
import {
  createSkillRegistry,
  type CreateSkillRegistryOptions,
} from "./skills/registry";
import { createOmnidrawAuthAdapter } from "./auth/adapter";
import { createMemoryKeyStore, type KeyStore } from "./auth/keychain";

import type { AuthAdapter } from "../contracts/auth";
import type { ChatModelAdapter } from "../contracts/chat";
import type { SkillRegistry } from "../contracts/skills";

export interface CreateAgentOptions {
  /**
   * Where to read/write the Omnizen API key.
   * Defaults to an in-memory store (tests / first dev runs).
   */
  keyStore?: KeyStore;
  /** Skill loader override (Vite glob, custom file resolver, etc.). */
  skills?: CreateSkillRegistryOptions;
  /** Override the Omnizen base URL (test rigs, regional endpoints). */
  baseUrl?: string;
  /** Open browser callback for the device flow. */
  openBrowser?: (url: string) => void | Promise<void>;
}

export interface AgentBundle {
  chat: ChatModelAdapter;
  skills: SkillRegistry;
  auth: AuthAdapter;
}

/**
 * Build the full agent bundle. Frontend wires the `chat` adapter into
 * assistant-ui's runtime, hangs the `skills` off the picker, and uses
 * `auth` for the connect screen.
 */
export function createAgent(opts: CreateAgentOptions = {}): AgentBundle {
  const keyStore = opts.keyStore ?? createMemoryKeyStore();
  const skills = createSkillRegistry(opts.skills);
  const auth = createOmnidrawAuthAdapter({
    store: keyStore,
    openBrowser: opts.openBrowser,
  });
  const chat = new OmnidrawChatAdapter({
    skills,
    baseUrl: opts.baseUrl,
    getApiKey: async () => {
      const rec = await keyStore.load();
      return rec?.apiKey ?? null;
    },
  });
  return { chat, skills, auth };
}

// Re-exports.
export { OmnidrawChatAdapter } from "./adapter";
export { createOmnidrawAuthAdapter } from "./auth/adapter";
export {
  createSkillRegistry,
  BUILTIN_SKILLS,
  stripFrontmatter,
} from "./skills/registry";
export {
  createMemoryKeyStore,
  createFileKeyStore,
  createStorageKeyStore,
  createTauriKeyStore,
  createKeyStore,
  type KeyRecord,
  type KeyStore,
} from "./auth/keychain";
export {
  startConnect,
  pollUntilApproved,
  type StartConnectResult,
  type PollResult,
} from "./auth/device-flow";
export { createOmnidrawTools, OMNIDRAW_TOOL_NAMES } from "./extension";
export {
  omnizenModel,
  OMNIZEN_API_BASE,
  OMNIZEN_AUTH_BASE,
  DEFAULT_OMNIZEN_MODEL_ID,
} from "./omnizen-provider";
export { createPi } from "./pi";
