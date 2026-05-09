import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Toggle({ checked, onChange, disabled, className, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-pill border transition-colors",
        checked
          ? "border-accent bg-accent/30"
          : "border-border-default bg-bg-input hover:bg-bg-input-hover",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-3 w-3 rounded-full bg-text-primary transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}
