import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/contracts";
import { ChatMessageBubble } from "./ChatMessageBubble";

export interface ChatThreadProps {
  messages: ChatMessage[];
  /** In-progress assistant message (rendered after committed messages). */
  pendingMessage?: ChatMessage | null;
}

export function ChatThread({ messages, pendingMessage }: ChatThreadProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, pendingMessage?.content?.length]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
        {messages.map((m) => (
          <ChatMessageBubble key={m.id} message={m} />
        ))}
        {pendingMessage && <ChatMessageBubble message={pendingMessage} />}
      </div>
    </div>
  );
}
