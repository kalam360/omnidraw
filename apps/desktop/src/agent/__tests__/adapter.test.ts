import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __testing, OmnidrawChatAdapter } from "../adapter";
import type { ChatStreamEvent, ToolCall } from "../../contracts/chat";
import type { CanvasController } from "../../contracts/canvas";

const stubCanvas = (): CanvasController => ({
  setScene: vi.fn(async () => ({ sceneId: "s1" })),
  addElements: vi.fn(async () => {}),
  updateElements: vi.fn(async () => {}),
  removeElements: vi.fn(async () => {}),
  getScene: vi.fn(async () => ({ elements: [], meta: {} })),
  snapshot: vi.fn(async () => ({ png: new Uint8Array(), width: 0, height: 0 })),
  on: vi.fn(() => () => {}),
});

describe("translateEvent", () => {
  const { translateEvent, EventQueue } = __testing;

  it("translates a typical Pi event sequence into ChatStreamEvents", async () => {
    const queue = new EventQueue<ChatStreamEvent>();
    const open = new Map<string, ToolCall>();
    const mid = "msg-1";

    // 1. Streaming text from the assistant.
    translateEvent(
      {
        type: "message_update",
        message: {} as never,
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "Hello",
          partial: {} as never,
        },
      } as never,
      mid,
      open,
      queue,
    );

    // 2. Tool call announced (toolcall_end).
    translateEvent(
      {
        type: "message_update",
        message: {} as never,
        assistantMessageEvent: {
          type: "toolcall_end",
          contentIndex: 1,
          toolCall: {
            type: "toolCall",
            id: "t-1",
            name: "create_scene",
            arguments: { title: "demo", elements: [] },
          },
          partial: {} as never,
        },
      } as never,
      mid,
      open,
      queue,
    );

    // 3. Tool execution finishes successfully.
    translateEvent(
      {
        type: "tool_execution_end",
        toolCallId: "t-1",
        toolName: "create_scene",
        result: { isError: false, content: [], details: { sceneId: "s1" } },
      } as never,
      mid,
      open,
      queue,
    );

    // 4. Agent end → message_complete.
    translateEvent(
      { type: "agent_end", messages: [] } as never,
      mid,
      open,
      queue,
    );

    queue.close();

    const out: ChatStreamEvent[] = [];
    for await (const ev of queue) out.push(ev);

    expect(out.map((e) => e.type)).toEqual([
      "token",
      "tool_call_start",
      "tool_call_complete",
      "message_complete",
    ]);

    const token = out[0] as Extract<ChatStreamEvent, { type: "token" }>;
    expect(token.delta).toBe("Hello");

    const start = out[1] as Extract<
      ChatStreamEvent,
      { type: "tool_call_start" }
    >;
    expect(start.tool.name).toBe("create_scene");
    expect((start.tool.args as { title: string }).title).toBe("demo");

    const complete = out[2] as Extract<
      ChatStreamEvent,
      { type: "tool_call_complete" }
    >;
    expect(complete.toolId).toBe("t-1");
    expect(complete.result?.ok).toBe(true);
    if (complete.result?.ok) {
      expect((complete.result.value as { sceneId: string }).sceneId).toBe("s1");
    }
  });

  it("emits tool_call_start even if toolcall_end is missing", async () => {
    const queue = new EventQueue<ChatStreamEvent>();
    const open = new Map<string, ToolCall>();
    translateEvent(
      {
        type: "tool_execution_start",
        toolCallId: "t-2",
        toolName: "add_elements",
        args: { elements: [] },
      } as never,
      "m",
      open,
      queue,
    );
    queue.close();

    const out: ChatStreamEvent[] = [];
    for await (const ev of queue) out.push(ev);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("tool_call_start");
  });

  it("encodes tool errors", async () => {
    const queue = new EventQueue<ChatStreamEvent>();
    const open = new Map<string, ToolCall>();
    open.set("t-3", { id: "t-3", name: "create_scene", args: {} });
    translateEvent(
      {
        type: "tool_execution_end",
        toolCallId: "t-3",
        toolName: "create_scene",
        result: { isError: true, content: [], details: null },
        error: new Error("boom"),
      } as never,
      "m",
      open,
      queue,
    );
    queue.close();
    const out: ChatStreamEvent[] = [];
    for await (const ev of queue) out.push(ev);
    expect(out[0].type).toBe("tool_call_complete");
    const c = out[0] as Extract<ChatStreamEvent, { type: "tool_call_complete" }>;
    expect(c.result?.ok).toBe(false);
    if (c.result && !c.result.ok) {
      expect(c.result.error).toBe("boom");
    }
  });
});

describe("OmnidrawChatAdapter.send", () => {
  let originalFetch: typeof fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch as typeof fetch;
    vi.restoreAllMocks();
  });

  it("yields error when not connected", async () => {
    const adapter = new OmnidrawChatAdapter({
      getApiKey: async () => null,
    });
    const events: ChatStreamEvent[] = [];
    for await (const ev of adapter.send({
      threadId: "t1",
      messages: [],
      canvas: stubCanvas(),
    })) {
      events.push(ev);
    }
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
  });
});
