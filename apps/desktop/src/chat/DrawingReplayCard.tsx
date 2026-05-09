import type { ToolCall } from "@/contracts";

/**
 * Render a "create_scene" / "add_elements" tool call as a small thumbnail
 * card that the canvas team's <DrawingReplay/> will eventually mount into.
 *
 * For now we show a stylised placeholder so the chat thread reads correctly
 * during the stub-adapter phase.
 */
export function DrawingReplayCard({ tool }: { tool: ToolCall }) {
  const title =
    typeof tool.args === "object" && tool.args && "title" in tool.args
      ? String((tool.args as { title?: string }).title)
      : tool.name;

  return (
    <div
      data-testid="drawing-replay"
      className="my-3 overflow-hidden rounded-3 border border-border-subtle bg-bg-input"
    >
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <span className="font-mono text-xs text-text-muted">{tool.name}</span>
        <span className="text-text-primary text-xs font-medium">{title}</span>
      </div>
      <div className="flex h-32 items-center justify-center bg-bg-surface text-text-subtle text-xs">
        canvas replay placeholder
      </div>
    </div>
  );
}
