import type { ReactNode } from "react";

export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-bg-page p-6">
      <div className="w-full max-w-[520px] rounded-4 border border-border-subtle bg-bg-panel p-8 shadow-modal">
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-text-muted">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
      {children}
    </div>
  );
}
