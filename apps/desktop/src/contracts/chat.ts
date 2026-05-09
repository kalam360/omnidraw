import type { CanvasController } from "./canvas";

/** A single message in a thread. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  /** Markdown content. */
  content: string;
  /** Tool calls the assistant made in this message. */
  toolCalls?: ToolCall[];
  createdAt: string; // ISO8601
}

export interface ToolCall {
  id: string;
  name: string;          // e.g. "create_scene", "add_element"
  args: unknown;         // JSON
  /** undefined while pending; set when complete. */
  result?: { ok: true; value: unknown } | { ok: false; error: string };
}

/** Implemented by the Agent team. Consumed by Frontend (assistant-ui adapter). */
export interface ChatModelAdapter {
  /**
   * Stream a response for the given thread state.
   * Yields incremental updates suitable for assistant-ui's runtime.
   */
  send(input: {
    threadId: string;
    messages: ChatMessage[];
    skillId?: string;       // currently selected skill
    canvas: CanvasController; // the agent calls canvas tools through this
  }): AsyncIterable<ChatStreamEvent>;

  /** Stop an in-flight generation. */
  cancel(threadId: string): Promise<void>;

  /** Health check used at app startup. */
  ping(): Promise<{ ok: true; model: string } | { ok: false; reason: string }>;
}

export type ChatStreamEvent =
  | { type: "token"; messageId: string; delta: string }
  | { type: "tool_call_start"; messageId: string; tool: ToolCall }
  | { type: "tool_call_complete"; messageId: string; toolId: string; result: ToolCall["result"] }
  | { type: "message_complete"; messageId: string }
  | { type: "error"; reason: string };
