/**
 * `ChatModelAdapter` implementation for Omnidraw.
 *
 * Bridges Pi's `AgentEvent` stream into the contract's
 * `ChatStreamEvent` discriminated union, which is what assistant-ui's
 * runtime consumes.
 *
 * Lifecycle:
 *   adapter.send({ threadId, messages, skillId, canvas })
 *     ├─ resolve skill → systemPrompt
 *     ├─ build Pi Agent (one per turn)
 *     ├─ subscribe to AgentEvent → push ChatStreamEvent into a queue
 *     ├─ kick off agent.prompt(lastUser)
 *     └─ async-iterate the queue until agent_end → close
 *
 * Cancellation: `cancel(threadId)` flips the queue to "done" and calls
 * `agent.abort()` for the active turn.
 */

import type { Agent, AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";

import type {
  ChatModelAdapter,
  ChatStreamEvent,
  ChatMessage,
  ToolCall,
} from "../contracts/chat";
import type { CanvasController } from "../contracts/canvas";

import { createPi } from "./pi";
import { OMNIZEN_API_BASE } from "./omnizen-provider";
import type { SkillRegistry } from "../contracts/skills";

const DEFAULT_SYSTEM = `\
You are Omnidraw, a hand-drawn diagramming assistant. You help the
user think visually by creating and refining Excalidraw scenes.

Style rules:
- Hand-drawn aesthetic (the canvas is Excalidraw — embrace it).
- Group by role: colour-code by the *function* of each element.
- Keep labels short. Whitespace is a feature.
- Prefer one focused scene over a busy one.

When the user asks for a visual, call canvas tools (\`create_scene\`,
\`add_elements\`, \`update_elements\`) to make it happen. Read the
current scene with \`get_scene\` before refining what's already there.
`;

export interface OmnidrawChatAdapterOptions {
  /** Resolves the API key when needed. Returns null when not connected. */
  getApiKey: () => Promise<string | null>;
  /** Skill registry — null skipps skill loading and uses the default prompt. */
  skills?: SkillRegistry | null;
  /** Override Omnizen base URL (tests / proxies). */
  baseUrl?: string;
  /** Override model id. */
  modelId?: string;
}

interface ActiveRun {
  agent: Agent;
  abort: () => void;
}

export class OmnidrawChatAdapter implements ChatModelAdapter {
  private active = new Map<string, ActiveRun>();

  constructor(private readonly opts: OmnidrawChatAdapterOptions) {}

  async *send(input: {
    threadId: string;
    messages: ChatMessage[];
    skillId?: string;
    canvas: CanvasController;
  }): AsyncIterable<ChatStreamEvent> {
    const apiKey = await this.opts.getApiKey();
    if (!apiKey) {
      yield {
        type: "error",
        reason: "Not connected. Run the connect flow first.",
      };
      return;
    }

    // Resolve skill body (or fall back to default system prompt).
    let systemPrompt = DEFAULT_SYSTEM;
    if (input.skillId && this.opts.skills) {
      const skill = await this.opts.skills.get(input.skillId);
      if (skill) {
        try {
          systemPrompt = await skill.loadBody();
        } catch (err) {
          yield {
            type: "error",
            reason: `Failed to load skill ${input.skillId}: ${err instanceof Error ? err.message : String(err)}`,
          };
          return;
        }
      }
    }

    const initialMessages = chatHistoryToAgentMessages(input.messages);
    // Pi's `prompt()` adds a fresh user turn — so we strip the trailing
    // user message from the transcript and feed it as the prompt.
    const lastUser =
      input.messages.length > 0 &&
      input.messages[input.messages.length - 1].role === "user"
        ? input.messages[input.messages.length - 1]
        : null;
    const transcriptForPi = lastUser
      ? initialMessages.slice(0, -1)
      : initialMessages;

    const { agent } = createPi({
      apiKey,
      baseUrl: this.opts.baseUrl ?? OMNIZEN_API_BASE,
      modelId: this.opts.modelId,
      canvas: input.canvas,
      systemPrompt,
      initialMessages: transcriptForPi,
    });

    const queue = new EventQueue<ChatStreamEvent>();
    const messageId = lastUser?.id ?? `msg-${Date.now()}`;
    // Track open tool calls so we can correlate start/end ids.
    const openTools = new Map<string, ToolCall>();

    const unsubscribe = agent.subscribe((event: AgentEvent) => {
      try {
        translateEvent(event, messageId, openTools, queue);
      } catch (err) {
        queue.push({
          type: "error",
          reason:
            err instanceof Error ? err.message : `event handler error: ${String(err)}`,
        });
      }
    });

    const abort = () => {
      try {
        agent.abort();
      } catch {
        /* ignore */
      }
    };
    this.active.set(input.threadId, { agent, abort });

    // Kick off the prompt without awaiting — the event stream is what
    // we yield from.
    const runPromise = (async () => {
      try {
        if (lastUser) {
          await agent.prompt(lastUser.content);
        } else {
          await agent.continue();
        }
      } catch (err) {
        queue.push({
          type: "error",
          reason:
            err instanceof Error ? err.message : `agent error: ${String(err)}`,
        });
      } finally {
        queue.close();
      }
    })();

    try {
      for await (const ev of queue) yield ev;
      await runPromise;
    } finally {
      unsubscribe();
      this.active.delete(input.threadId);
    }
  }

  async cancel(threadId: string): Promise<void> {
    const run = this.active.get(threadId);
    if (run) run.abort();
  }

  async ping(): Promise<{ ok: true; model: string } | { ok: false; reason: string }> {
    const apiKey = await this.opts.getApiKey();
    if (!apiKey) return { ok: false, reason: "not_connected" };
    const baseUrl = this.opts.baseUrl ?? OMNIZEN_API_BASE;
    try {
      // Anthropic-compat /messages with a tiny payload — cheapest valid
      // call. Omnizen's gateway returns 200 + a stub assistant message
      // even for trivial inputs.
      const res = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          // Ping always uses the cheap flash model regardless of which
          // model this adapter is otherwise configured for.
          model: "deepseek-v4-flash",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (!res.ok) {
        return { ok: false, reason: `${res.status} ${res.statusText}` };
      }
      const body = (await res.json().catch(() => ({}))) as {
        model?: string;
      };
      return { ok: true, model: body.model ?? this.opts.modelId ?? "unknown" };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// -- Helpers ----------------------------------------------------------------

function translateEvent(
  event: AgentEvent,
  messageId: string,
  openTools: Map<string, ToolCall>,
  queue: EventQueue<ChatStreamEvent>,
): void {
  switch (event.type) {
    case "message_update": {
      const ame = event.assistantMessageEvent;
      if (ame.type === "text_delta") {
        queue.push({ type: "token", messageId, delta: ame.delta });
      } else if (ame.type === "toolcall_end") {
        const tc = ame.toolCall;
        const toolCall: ToolCall = {
          id: tc.id,
          name: tc.name,
          args: tc.arguments,
        };
        openTools.set(tc.id, toolCall);
        queue.push({ type: "tool_call_start", messageId, tool: toolCall });
      }
      return;
    }
    case "tool_execution_start": {
      // If we missed the toolcall_end (parallel ordering), still emit a
      // start event so the UI doesn't stall.
      if (!openTools.has(event.toolCallId)) {
        const toolCall: ToolCall = {
          id: event.toolCallId,
          name: event.toolName,
          args: event.args,
        };
        openTools.set(event.toolCallId, toolCall);
        queue.push({ type: "tool_call_start", messageId, tool: toolCall });
      }
      return;
    }
    case "tool_execution_end": {
      const e = event as Extract<AgentEvent, { type: "tool_execution_end" }> & {
        result?: { isError?: boolean; content?: unknown; details?: unknown };
        error?: unknown;
      };
      const isError = Boolean(e.result?.isError) || Boolean(e.error);
      const value = e.result?.details ?? e.result?.content;
      const result: ToolCall["result"] = isError
        ? {
            ok: false,
            error:
              e.error instanceof Error
                ? e.error.message
                : typeof e.error === "string"
                  ? e.error
                  : "Tool execution failed",
          }
        : { ok: true, value };
      queue.push({
        type: "tool_call_complete",
        messageId,
        toolId: event.toolCallId,
        result,
      });
      openTools.delete(event.toolCallId);
      return;
    }
    case "agent_end":
      queue.push({ type: "message_complete", messageId });
      return;
    default:
      return;
  }
}

/**
 * Convert the contract's `ChatMessage[]` (markdown content) into Pi's
 * `AgentMessage[]` (structured content). Tool calls/results stored on
 * past messages are not faithfully replayed here — for v1 we feed only
 * the textual transcript. v2 should serialise tool calls into Pi's
 * AssistantMessage content blocks.
 */
function chatHistoryToAgentMessages(history: ChatMessage[]): AgentMessage[] {
  return history.map((m) => {
    if (m.role === "user") {
      return {
        role: "user",
        content: m.content,
        timestamp: Date.parse(m.createdAt) || Date.now(),
      } as unknown as AgentMessage;
    }
    if (m.role === "assistant") {
      // Pi's AssistantMessage requires a fully-typed content array. For
      // history replay we collapse to a single text block.
      return {
        role: "assistant",
        content: [{ type: "text", text: m.content }],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "history",
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "stop",
        timestamp: Date.parse(m.createdAt) || Date.now(),
      } as unknown as AgentMessage;
    }
    // System messages are pulled from the skill body, not the transcript.
    return {
      role: "user",
      content: m.content,
      timestamp: Date.parse(m.createdAt) || Date.now(),
    } as unknown as AgentMessage;
  });
}

/**
 * Tiny async-iterable queue. Push events synchronously, await them
 * asynchronously, close once the producer is done.
 */
class EventQueue<T> implements AsyncIterable<T> {
  private buf: T[] = [];
  private waiters: Array<(v: IteratorResult<T>) => void> = [];
  private closed = false;

  push(value: T): void {
    if (this.closed) return;
    const w = this.waiters.shift();
    if (w) w({ value, done: false });
    else this.buf.push(value);
  }

  close(): void {
    this.closed = true;
    while (this.waiters.length) {
      const w = this.waiters.shift()!;
      w({ value: undefined as unknown as T, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () =>
        new Promise<IteratorResult<T>>((resolve) => {
          if (this.buf.length) {
            resolve({ value: this.buf.shift()!, done: false });
            return;
          }
          if (this.closed) {
            resolve({ value: undefined as unknown as T, done: true });
            return;
          }
          this.waiters.push(resolve);
        }),
      return: async () => {
        this.close();
        return { value: undefined as unknown as T, done: true };
      },
    };
  }
}

// Exported only for tests.
export const __testing = { EventQueue, translateEvent };
