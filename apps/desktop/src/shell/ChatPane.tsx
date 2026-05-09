import { useCallback, useEffect, useState } from "react";
import type { ChatMessage } from "@/contracts";
import { ChatThread } from "@/chat/ChatThread";
import { ChatComposer } from "@/chat/ChatComposer";
import { Badge, Button, StatusDot } from "@/ui";
import { useChat, useStorage, useCanvas, useSkills } from "@/lib/adapters/adapters-context";
import { useStreamingMessage } from "@/lib/hooks/useStreamingMessage";

export interface ChatPaneProps {
  threadId: string;
  threadTitle: string;
  onOpenSkillPicker?: () => void;
  selectedSkillId?: string;
}

export function ChatPane({ threadId, threadTitle, onOpenSkillPicker, selectedSkillId }: ChatPaneProps) {
  const chat = useChat();
  const storage = useStorage();
  const canvas = useCanvas();
  const skills = useSkills();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [skillName, setSkillName] = useState<string | undefined>();
  const stream = useStreamingMessage(chat, canvas);

  useEffect(() => {
    storage.getThread(threadId).then((t) => setMessages(t.messages));
  }, [storage, threadId]);

  useEffect(() => {
    if (!selectedSkillId) {
      setSkillName(undefined);
      return;
    }
    skills.get(selectedSkillId).then((s) => setSkillName(s?.name));
  }, [skills, selectedSkillId]);

  const handleSubmit = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      await storage.appendMessage(threadId, userMsg);
      await stream.send({ threadId, messages: [...messages, userMsg], skillId: selectedSkillId });
      // Commit the streamed assistant message once finished.
      // (Re-read state on next tick — useStreamingMessage exposes the final value.)
    },
    [messages, selectedSkillId, storage, stream, threadId],
  );

  // When the stream completes and yields a finalised message, persist it.
  useEffect(() => {
    if (!stream.pending && stream.message) {
      const final = stream.message;
      // Persist only once: append if not already in messages.
      setMessages((prev) => (prev.find((m) => m.id === final.id) ? prev : [...prev, final]));
      storage.appendMessage(threadId, final).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.pending]);

  return (
    <section className="flex h-full w-[420px] shrink-0 flex-col bg-bg-page" aria-label="Chat">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <span className="truncate text-text-primary text-sm font-medium">{threadTitle}</span>
        <Badge variant="accent" className="ml-2">
          <StatusDot status="success" />
          deepseek-v4-pro
        </Badge>
        <Button size="sm" icon variant="ghost" aria-label="History" className="ml-auto">⊞</Button>
        <Button size="sm" icon variant="ghost" aria-label="More">⋯</Button>
      </header>
      <ChatThread messages={messages} pendingMessage={stream.pending ? stream.message : null} />
      <ChatComposer
        skillName={skillName}
        onSubmit={handleSubmit}
        onPickSkill={onOpenSkillPicker}
        disabled={stream.pending}
      />
    </section>
  );
}
