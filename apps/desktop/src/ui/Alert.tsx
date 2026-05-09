import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "info" | "danger" | "warning" | "success";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: Variant;
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}

const variants: Record<Variant, string> = {
  info: "border-border-default bg-bg-input",
  danger: "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] text-[var(--danger)]",
  warning: "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)] text-[var(--warning)]",
  success: "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.06)] text-[var(--success)]",
};

export function Alert({
  className,
  variant = "info",
  icon,
  title,
  description,
  children,
  ...rest
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-3 border p-4 text-sm",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon && <span className="mt-[1px] text-base leading-none shrink-0">{icon}</span>}
      <div className="flex-1 text-text-body">
        {title && <div className="mb-1 font-medium text-text-primary">{title}</div>}
        {description && <div className="text-text-muted text-xs leading-relaxed">{description}</div>}
        {children}
      </div>
    </div>
  );
}
