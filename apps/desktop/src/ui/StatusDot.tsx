import { cn } from "@/lib/utils";

type Status = "default" | "success" | "warning" | "danger" | "connecting";

const variants: Record<Status, string> = {
  default: "bg-text-subtle",
  success: "bg-[var(--success)] shadow-[0_0_8px_rgba(16,185,129,0.5)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  connecting: "bg-accent-bright animate-pulse-soft",
};

export function StatusDot({ status = "default", className }: { status?: Status; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", variants[status], className)}
    />
  );
}
