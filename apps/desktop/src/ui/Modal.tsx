import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  trailing?: ReactNode;
  width?: number;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  trailing,
  width = 480,
  children,
  className,
  ...rest
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    cardRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,9,10,0.7)] backdrop-blur-sm",
      )}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "rounded-4 border border-border-strong bg-bg-panel shadow-modal outline-none",
          className,
        )}
        style={{ width }}
        {...rest}
      >
        {(title || trailing) && (
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
            <span className="text-sm font-medium text-text-primary">{title}</span>
            {trailing && <span className="text-text-subtle text-xs">{trailing}</span>}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
