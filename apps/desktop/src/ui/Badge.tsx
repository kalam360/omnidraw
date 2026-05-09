import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "accent";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "border-border-default text-text-muted",
  success: "border-[rgba(16,185,129,0.3)] text-[var(--success)]",
  warning: "border-[rgba(245,158,11,0.3)] text-[var(--warning)]",
  danger: "border-[rgba(239,68,68,0.3)] text-[var(--danger)]",
  accent: "border-[rgba(34,211,238,0.3)] text-accent-bright",
};

export function Badge({ className, variant = "default", ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-pill border bg-bg-input px-2 text-xs font-medium tracking-wide",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
