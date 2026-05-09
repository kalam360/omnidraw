import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const base =
  "h-9 w-full rounded-3 border border-border-default bg-bg-input px-3 text-sm text-text-primary transition-colors focus:bg-bg-input-hover focus:border-border-strong focus:outline-none focus-visible:[box-shadow:var(--shadow-focus)] disabled:opacity-50";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...rest }, ref) => (
  <select ref={ref} className={cn(base, className)} {...rest}>
    {children}
  </select>
));
Select.displayName = "Select";
