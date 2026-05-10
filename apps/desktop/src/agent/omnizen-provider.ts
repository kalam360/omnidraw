/**
 * Omnizen provider for pi-ai.
 *
 * Omnizen exposes an Anthropic-compatible Messages API at
 * `https://api.omnizen.ai/v1`. pi-ai's built-in `anthropic-messages`
 * provider already handles auto-detected base-URL overrides via
 * `model.baseUrl` (see `pi-ai/dist/providers/anthropic.js` — the
 * provider passes `model.baseUrl` directly to the `Anthropic` SDK
 * client constructor).
 *
 * So we don't need a custom `streamFunction`. We just construct a
 * `Model<"anthropic-messages">` whose `baseUrl` points at omnizen.
 *
 * Models we use:
 *   - `deepseek-v4-pro`   — default for chat. Best reasoning, slower, costlier.
 *   - `deepseek-v4-flash` — used for cheap pings (key validation, health
 *     checks) and for low-complexity user requests when complexity routing
 *     is enabled. ~5x cheaper, ~3x faster.
 *
 * Pi/Omnizen also expose `claude-3-5-sonnet-*` aliases that Omnizen
 * routes to credible upstream equivalents — kept available via
 * `omnizenModel({ modelId: "claude-3-5-sonnet-latest" })` for users
 * who want to test against a different routed family.
 */

import type { Model } from "@earendil-works/pi-ai";

export const OMNIZEN_API_BASE = "https://api.omnizen.ai/v1";
export const OMNIZEN_AUTH_BASE = "https://api.omnizen.ai/api/cli/auth";

/** Pro model — used for default chat + complex requests. */
export const OMNIZEN_PRO_MODEL_ID = "deepseek-v4-pro";

/** Flash model — used for pings, validation, and low-complexity requests. */
export const OMNIZEN_FLASH_MODEL_ID = "deepseek-v4-flash";

/** Default model id sent to Omnizen for normal chat. */
export const DEFAULT_OMNIZEN_MODEL_ID = OMNIZEN_PRO_MODEL_ID;

/** Cheap model for pings / key validation. */
export const OMNIZEN_PING_MODEL_ID = OMNIZEN_FLASH_MODEL_ID;

/**
 * Heuristic: pick `flash` for short / low-complexity prompts, otherwise
 * `pro`. Caller can override per-message; this is the default policy.
 *
 * v0.1 rule (simple but useful): treat as `flash` when the latest user
 * prompt is short and looks like a quick reply. Otherwise `pro`.
 *
 * v0.2 will replace this with a proper classifier (cheap LLM call or
 * a small heuristic on conversation state + tool intent).
 */
export function pickOmnizenModelByComplexity(latestUserPrompt: string): string {
  const trimmed = latestUserPrompt.trim();
  // Short single-line ack / "yes" / "no" / quick clarification → flash
  if (trimmed.length < 60 && !/[`{}\[\]]/.test(trimmed) && trimmed.split("\n").length === 1) {
    return OMNIZEN_FLASH_MODEL_ID;
  }
  // Code blocks, math, or longer prompts → pro
  return OMNIZEN_PRO_MODEL_ID;
}

export interface OmnizenModelOptions {
  /** Override the model id sent to Omnizen (e.g. "claude-3-5-haiku-latest"). */
  modelId?: string;
  /** Override the base URL (useful for tests / proxies). */
  baseUrl?: string;
  /** Display name in UIs that show the model. */
  displayName?: string;
}

/**
 * Build a Pi `Model` object pointing at Omnizen's Anthropic-compatible
 * endpoint. Pair this with the `apiKey` callback in `Agent.getApiKey`
 * to authenticate.
 */
export function omnizenModel(opts: OmnizenModelOptions = {}): Model<"anthropic-messages"> {
  const modelId = opts.modelId ?? DEFAULT_OMNIZEN_MODEL_ID;
  return {
    id: modelId,
    name: opts.displayName ?? `Omnizen (${modelId})`,
    api: "anthropic-messages",
    // We re-use the "anthropic" provider key so pi-ai's env-api-key
    // resolution and registry treat us as an Anthropic-compatible
    // backend. The actual key flows through `Agent.getApiKey` and is
    // an Omnizen-issued `omn_live_*` key.
    provider: "anthropic",
    baseUrl: opts.baseUrl ?? OMNIZEN_API_BASE,
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200_000,
    maxTokens: 8_192,
    // Anthropic-compat: sensible defaults; the underlying upstream
    // (DeepSeek/Kimi) may not honour every cache-control marker but
    // ignoring them is safe.
    compat: {
      cacheControlFormat: "anthropic",
    } as never,
  };
}
