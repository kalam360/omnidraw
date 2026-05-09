import { useCallback, useRef, useState } from "react";
import type {
  CanvasController,
  ChatMessage,
  ChatModelAdapter,
  ChatStreamEvent,
  ToolCall,
} from "@/contracts";

export interface StreamingState {
  /** The in-progress assistant message, or null if idle. */
  message: ChatMessage | null;
  /** Tool calls accumulated for the in-progress message. */
  toolCalls: ToolCall[];
  /** True while the stream is open. */
  pending: boolean;
  /** Last error reason, if any. */
  error: string | null;
}

/**
 * Drives a ChatModelAdapter and exposes the in-progress assistant message.
 * Calling `send` clears any prior in-progress state and starts a new stream.
 */
export function useStreamingMessage(adapter: ChatModelAdapter, canvas: CanvasController) {
  const [state, setState] = useState<StreamingState>({
    message: null,
    toolCalls: [],
    pending: false,
    error: null,
  });
  const cancelRef = useRef<{ threadId: string } | null>(null);

  const send = useCallback(
    async (input: { threadId: string; messages: ChatMessage[]; skillId?: string }) => {
      cancelRef.current = { threadId: input.threadId };
      setState({ message: null, toolCalls: [], pending: true, error: null });
      let acc = "";
      const toolCalls: ToolCall[] = [];
      let messageId = "";

      const apply = () => {
        setState({
          message: messageId
            ? {
                id: messageId,
                role: "assistant",
                content: acc,
                toolCalls: toolCalls.slice(),
                createdAt: new Date().toISOString(),
              }
            : null,
          toolCalls: toolCalls.slice(),
          pending: true,
          error: null,
        });
      };

      try {
        for await (const ev of adapter.send({ ...input, canvas }) as AsyncIterable<ChatStreamEvent>) {
          switch (ev.type) {
            case "token":
              messageId = ev.messageId;
              acc += ev.delta;
              apply();
              break;
            case "tool_call_start":
              toolCalls.push(ev.tool);
              apply();
              break;
            case "tool_call_complete": {
              const tc = toolCalls.find((t) => t.id === ev.toolId);
              if (tc) tc.result = ev.result;
              apply();
              break;
            }
            case "message_complete":
              setState((s) => ({ ...s, pending: false }));
              return;
            case "error":
              setState((s) => ({ ...s, pending: false, error: ev.reason }));
              return;
          }
        }
        setState((s) => ({ ...s, pending: false }));
      } catch (e) {
        setState((s) => ({ ...s, pending: false, error: (e as Error).message }));
      }
    },
    [adapter, canvas],
  );

  const cancel = useCallback(async () => {
    if (cancelRef.current) await adapter.cancel(cancelRef.current.threadId);
    setState((s) => ({ ...s, pending: false }));
  }, [adapter]);

  return { ...state, send, cancel };
}
