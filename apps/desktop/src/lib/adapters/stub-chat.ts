import type { ChatModelAdapter, ChatStreamEvent } from "@/contracts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const id = () => Math.random().toString(36).slice(2, 10);

async function* cannedStream(): AsyncIterable<ChatStreamEvent> {
  const messageId = `m_${id()}`;
  await sleep(120);
  yield { type: "token", messageId, delta: "Sure — " };
  await sleep(120);
  yield { type: "token", messageId, delta: "I'll sketch that out." };
  await sleep(160);
  const tc = { id: `tc_${id()}`, name: "create_scene", args: { title: "Stub scene" } };
  yield { type: "tool_call_start", messageId, tool: tc };
  await sleep(220);
  yield {
    type: "tool_call_complete",
    messageId,
    toolId: tc.id,
    result: { ok: true, value: { elements: 6 } },
  };
  yield { type: "message_complete", messageId };
}

export const stubChatAdapter: ChatModelAdapter = {
  send() {
    return cannedStream();
  },
  async cancel() {
    /* no-op */
  },
  async ping() {
    return { ok: true, model: "stub-mini" };
  },
};
