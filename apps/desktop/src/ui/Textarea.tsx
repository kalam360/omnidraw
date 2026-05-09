import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const base =
  "w-full resize-none rounded-3 border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-subtle transition-colors focus:bg-bg-input-hover focus:border-border-strong focus:outline-none focus-visible:[box-shadow:var(--shadow-focus)] disabled:opacity-50";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 3, ...rest }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(base, className)} {...rest} />
  ),
);
Textarea.displayName = "Textarea";
