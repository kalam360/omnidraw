import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Square icon-only button. */
  icon?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-3 border text-text-body font-medium transition-colors focus:outline-none focus-visible:[box-shadow:var(--shadow-focus)] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  default:
    "bg-bg-input border-border-default hover:bg-bg-input-hover hover:border-border-strong",
  primary:
    "bg-accent text-bg-page border-accent hover:bg-accent-hover hover:border-accent-hover",
  ghost: "bg-transparent border-transparent hover:bg-bg-input-hover",
  danger:
    "bg-transparent border-[rgba(239,68,68,0.3)] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.08)]",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-8 px-3 text-sm",
  lg: "h-10 px-4 text-sm",
};

const iconSizes: Record<Size, string> = {
  sm: "h-7 w-7 px-0",
  md: "h-8 w-8 px-0",
  lg: "h-10 w-10 px-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "md", icon = false, type = "button", ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], icon ? iconSizes[size] : sizes[size], className)}
      {...rest}
    />
  ),
);
Button.displayName = "Button";
