import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Lightweight CSS-only tooltip. Sufficient for omnidraw's needs; the
 * complex shadcn/radix tooltip primitive is not required for the
 * sparingly-used hover affordances in the prototype.
 */
export function Tooltip({ label, children, className }: TooltipProps) {
  const [hover, setHover] = useState(false);
  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      {hover && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-2 border border-border-default bg-bg-panel px-2 py-1 text-xs text-text-body shadow-soft"
        >
          {label}
        </span>
      )}
    </span>
  );
}
