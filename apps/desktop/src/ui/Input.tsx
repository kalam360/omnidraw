import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const base =
  "h-9 w-full rounded-3 border border-border-default bg-bg-input px-3 text-sm text-text-primary placeholder:text-text-subtle transition-colors focus:bg-bg-input-hover focus:border-border-strong focus:outline-none focus-visible:[box-shadow:var(--shadow-focus)] disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cn(base, className)} {...rest} />
));
Input.displayName = "Input";
