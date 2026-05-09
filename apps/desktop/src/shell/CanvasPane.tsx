import type { ReactNode } from "react";

export interface CanvasPaneProps {
  title: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}

/**
 * The right column of the session screen — pane head + the canvas itself.
 * The actual <OmnidrawCanvas/> component is owned by the Canvas team and
 * lazy-loaded by `routes/Session.tsx`.
 */
export function CanvasPane({ title, trailing, children }: CanvasPaneProps) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col border-r border-border-subtle bg-bg-page">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        <span className="text-text-primary text-sm font-medium">{title}</span>
        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </header>
      <div className="flex flex-1 flex-col overflow-hidden bg-bg-page">{children}</div>
    </section>
  );
}
