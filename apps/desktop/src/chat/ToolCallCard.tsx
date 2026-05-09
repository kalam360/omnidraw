import type { ToolCall } from "@/contracts";
import { cn } from "@/lib/utils";

export function ToolCallCard({ tool }: { tool: ToolCall }) {
  const failed = tool.result && !tool.result.ok;
  const args = typeof tool.args === "object" ? JSON.stringify(tool.args, null, 2) : String(tool.args);

  return (
    <div
      className={cn(
        "my-2 rounded-3 border bg-bg-input px-3 py-2 font-mono text-xs",
        failed
          ? "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]"
          : "border-border-default",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-medium",
            failed ? "text-[var(--danger)]" : "text-text-body",
          )}
        >
          {tool.name}
        </span>
        {tool.result?.ok && (
          <span className="ml-auto text-[var(--success)]">
            {summary(tool.result.value) ?? "ok"}
          </span>
        )}
        {tool.result && !tool.result.ok && (
          <span className="ml-auto text-[var(--danger)]">✗ {tool.result.error}</span>
        )}
        {!tool.result && <span className="ml-auto text-text-subtle">running…</span>}
      </div>
      {args && (
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-text-muted">
          {args}
        </pre>
      )}
    </div>
  );
}

function summary(value: unknown): string | null {
  if (value && typeof value === "object" && "elements" in value) {
    return `✓ ${(value as { elements: number }).elements} elements`;
  }
  return null;
}
