/**
 * End-to-end test for `OmnidrawChatAdapter.send` with a mocked Pi.
 *
 * Confirms the spec's acceptance criterion: "Mock Pi run with a fake
 * provider yields a sensible ChatStreamEvent sequence (token →
 * tool_call_start → tool_call_complete → message_complete)".
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("../pi", () => {
  // Build a minimal fake `Agent` that fires a scripted event stream
  // when `prompt()` is called.
  return {
    createPi: () => {
      const listeners: Array<(ev: unknown) => void> = [];
      const agent = {
        subscribe(listener: (ev: unknown) => void) {
          listeners.push(listener);
          return () => {
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
          };
        },
        async prompt(_input: string) {
          const send = (ev: unknown) => {
            for (const l of listeners) l(ev);
          };
          await Promise.resolve();
          send({ type: "agent_start" });
          send({
            type: "message_update",
            message: {},
            assistantMessageEvent: {
              type: "text_delta",
              contentIndex: 0,
              delta: "Drawing ",
              partial: {},
            },
          });
          send({
            type: "message_update",
            message: {},
            assistantMessageEvent: {
              type: "text_delta",
              contentIndex: 0,
              delta: "scene...",
              partial: {},
            },
          });
          send({
            type: "message_update",
            message: {},
            assistantMessageEvent: {
              type: "toolcall_end",
              contentIndex: 1,
              toolCall: {
                type: "toolCall",
                id: "tc-1",
                name: "create_scene",
                arguments: { title: "demo", elements: [] },
              },
              partial: {},
            },
          });
          send({
            type: "tool_execution_end",
            toolCallId: "tc-1",
            toolName: "create_scene",
            result: {
              isError: false,
              content: [],
              details: { sceneId: "s1", count: 0 },
            },
          });
          send({ type: "agent_end", messages: [] });
        },
        async continue() {
          /* noop */
        },
        abort() {
          /* noop */
        },
      };
      return { agent, model: { id: "claude-3-5-sonnet-latest" } };
    },
  };
});

import { OmnidrawChatAdapter } from "../adapter";
import type { ChatStreamEvent } from "../../contracts/chat";
import type { CanvasController } from "../../contracts/canvas";

const canvas: CanvasController = {
  setScene: vi.fn(async () => ({ sceneId: "s1" })),
  addElements: vi.fn(async () => {}),
  updateElements: vi.fn(async () => {}),
  removeElements: vi.fn(async () => {}),
  getScene: vi.fn(async () => ({ elements: [], meta: {} })),
  snapshot: vi.fn(async () => ({ png: new Uint8Array(), width: 0, height: 0 })),
  on: vi.fn(() => () => {}),
};

describe("OmnidrawChatAdapter (mocked Pi)", () => {
  it("emits the documented ChatStreamEvent sequence", async () => {
    const adapter = new OmnidrawChatAdapter({
      getApiKey: async () => "omn_live_test",
    });

    const out: ChatStreamEvent[] = [];
    for await (const ev of adapter.send({
      threadId: "t1",
      canvas,
      messages: [
        {
          id: "u1",
          role: "user",
          content: "Draw me a thing",
          createdAt: new Date().toISOString(),
        },
      ],
    })) {
      out.push(ev);
    }

    const types = out.map((e) => e.type);
    expect(types).toEqual([
      "token",
      "token",
      "tool_call_start",
      "tool_call_complete",
      "message_complete",
    ]);

    expect(
      (out[0] as Extract<ChatStreamEvent, { type: "token" }>).delta,
    ).toBe("Drawing ");
    expect(
      (out[2] as Extract<ChatStreamEvent, { type: "tool_call_start" }>).tool
        .name,
    ).toBe("create_scene");
    const complete = out[3] as Extract<
      ChatStreamEvent,
      { type: "tool_call_complete" }
    >;
    expect(complete.result?.ok).toBe(true);
  });
});
