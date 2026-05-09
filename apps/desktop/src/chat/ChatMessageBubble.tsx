import type { ChatMessage } from "@/contracts";
import { cn } from "@/lib/utils";
import { ToolCallCard } from "./ToolCallCard";
import { DrawingReplayCard } from "./DrawingReplayCard";

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article
      data-role={message.role}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[640px] text-sm leading-relaxed",
          isUser
            ? "rounded-3 border border-border-subtle bg-bg-surface px-4 py-2.5 text-text-primary"
            : "w-full text-text-body",
        )}
      >
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

        {message.toolCalls?.map((tc) => {
          const isCanvasCall = tc.name === "create_scene" || tc.name === "add_elements";
          return isCanvasCall ? (
            <DrawingReplayCard key={tc.id} tool={tc} />
          ) : (
            <ToolCallCard key={tc.id} tool={tc} />
          );
        })}
      </div>
    </article>
  );
}
