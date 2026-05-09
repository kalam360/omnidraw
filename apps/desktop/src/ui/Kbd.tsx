import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-block rounded-2 border border-border-default bg-bg-input px-1.5 py-0 font-mono text-xs leading-snug text-text-muted",
        className,
      )}
      {...rest}
    />
  );
}
