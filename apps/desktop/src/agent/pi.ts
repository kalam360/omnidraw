/**
 * Pi agent factory.
 *
 * pi-agent-core's `Agent` is constructed once per chat turn — it owns
 * the transcript, emits lifecycle events, and runs tool calls.
 *
 * Note on the spec sketch: the spec mentions `piCreateAgent({ provider,
 * extensions, tools })` but the actual `0.74.0` API is class-based:
 *
 *   const agent = new Agent({ initialState: { systemPrompt, model, tools } });
 *   agent.subscribe(handler);
 *   await agent.prompt("...");
 *
 * We honour the spec's *intent* — embed Pi as an SDK, not a CLI — and
 * call out the API divergence in the team report.
 */

import { Agent } from "@earendil-works/pi-agent-core";
import type { AgentTool, AgentMessage } from "@earendil-works/pi-agent-core";
import type { Model } from "@earendil-works/pi-ai";

import { omnizenModel, OMNIZEN_API_BASE } from "./omnizen-provider";
import { createOmnidrawTools } from "./extension";

import type { CanvasController } from "../contracts/canvas";

export interface CreatePiOptions {
  /** Omnizen-issued API key (`omn_live_*`). */
  apiKey: string;
  /** Override the Omnizen base URL (defaults to `https://api.omnizen.ai/v1`). */
  baseUrl?: string;
  /** Canvas controller the tools call into. */
  canvas: CanvasController;
  /** System prompt. Usually loaded from a Skill's `SKILL.md` body. */
  systemPrompt: string;
  /** Override model id (defaults to Omnizen's Sonnet alias). */
  modelId?: string;
  /** Pre-existing transcript (when continuing a stored thread). */
  initialMessages?: AgentMessage[];
  /** Extra tools beyond the canvas tools. */
  extraTools?: AgentTool[];
}

export interface PiHandle {
  agent: Agent;
  model: Model<"anthropic-messages">;
}

/**
 * Construct a Pi `Agent` wired to Omnizen and the canvas tools.
 *
 * The returned `Agent` is *not yet running*. The caller subscribes to
 * its events (see `OmnidrawChatAdapter`) and then calls
 * `agent.prompt(...)` to trigger a turn.
 */
export function createPi(opts: CreatePiOptions): PiHandle {
  const model = omnizenModel({
    modelId: opts.modelId,
    baseUrl: opts.baseUrl ?? OMNIZEN_API_BASE,
  });

  const tools: AgentTool[] = [
    ...createOmnidrawTools({ canvas: opts.canvas }),
    ...(opts.extraTools ?? []),
  ];

  const agent = new Agent({
    initialState: {
      systemPrompt: opts.systemPrompt,
      model,
      tools,
      messages: opts.initialMessages ?? [],
    },
    // Pi calls this for the model's provider name. Our Omnizen model
    // declares `provider: "anthropic"`, so this returns the Omnizen key
    // when Pi asks for "anthropic".
    getApiKey: (provider) =>
      provider === "anthropic" ? opts.apiKey : undefined,
  });

  return { agent, model };
}
