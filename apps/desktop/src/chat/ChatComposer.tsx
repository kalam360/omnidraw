import { useState, type KeyboardEvent } from "react";
import { Button, Kbd } from "@/ui";
import { cn } from "@/lib/utils";

export interface ChatComposerProps {
  skillName?: string;
  onSubmit: (text: string) => void;
  onPickSkill?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  skillName,
  onSubmit,
  onPickSkill,
  disabled,
  placeholder = "Continue the conversation or request a new scene…",
}: ChatComposerProps) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-border-subtle bg-bg-page p-4">
      <div className="rounded-4 border border-border-default bg-bg-input transition-colors focus-within:border-border-strong focus-within:bg-bg-input-hover">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={3}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-text-primary placeholder:text-text-subtle",
            "focus:outline-none",
          )}
        />
        <div className="flex items-center gap-2 px-2 pb-2">
          <button
            type="button"
            onClick={onPickSkill}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill border border-border-default bg-bg-input px-2.5 py-1 text-xs text-text-muted transition-colors hover:bg-bg-input-hover hover:text-text-body",
              skillName && "border-accent text-accent-bright",
            )}
          >
            <span aria-hidden>◰</span>
            {skillName ?? "Choose skill"}
            <span className="ml-1 text-text-subtle">
              <Kbd>⌘K</Kbd>
            </span>
          </button>
          <span className="ml-auto text-text-subtle text-xs">
            <Kbd>Enter</Kbd> to send · <Kbd>Shift+Enter</Kbd> newline
          </span>
          <Button variant="primary" size="sm" disabled={disabled || !text.trim()} onClick={submit}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
