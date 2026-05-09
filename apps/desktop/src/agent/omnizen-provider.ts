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
 * The default model id is the Sonnet alias the omnizen team
 * documents; omnizen routes that alias to credible Chinese
 * equivalents (DeepSeek/Kimi/etc.) automatically.
 */

import type { Model } from "@earendil-works/pi-ai";

export const OMNIZEN_API_BASE = "https://api.omnizen.ai/v1";
export const OMNIZEN_AUTH_BASE = "https://api.omnizen.ai/api/cli/auth";

/** Default model id sent to Omnizen. Omnizen aliases this to its
 * routed underlying model. */
export const DEFAULT_OMNIZEN_MODEL_ID = "claude-3-5-sonnet-latest";

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
