import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import Connection from "./Connection";
import Model from "./Model";
import Storage from "./Storage";
import Appearance from "./Appearance";
import DangerZone from "./DangerZone";

const SECTIONS = [
  { id: "connection", label: "Connection", Comp: Connection },
  { id: "model", label: "Model", Comp: Model },
  { id: "storage", label: "Storage", Comp: Storage },
  { id: "appearance", label: "Appearance", Comp: Appearance },
  { id: "danger", label: "Danger zone", Comp: DangerZone },
] as const;

export default function Settings() {
  const [active, setActive] = useState<typeof SECTIONS[number]["id"]>("connection");
  const Comp = SECTIONS.find((s) => s.id === active)!.Comp;

  return (
    <div className="flex h-full flex-1 bg-bg-page">
      <aside className="w-[200px] shrink-0 border-r border-border-subtle bg-bg-panel py-4">
        <div className="mb-2 px-4 text-text-subtle text-xs font-medium uppercase tracking-wider">Settings</div>
        <nav className="px-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                "flex w-full items-center rounded-3 px-3 py-1.5 text-left text-sm font-medium transition-colors",
                active === s.id
                  ? "bg-bg-surface-hover text-text-primary"
                  : "text-text-muted hover:bg-bg-input-hover hover:text-text-body",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <Comp />
        </div>
      </div>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-text-primary text-xl font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-text-muted text-sm leading-relaxed">{description}</p>
      )}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function SettingsRow({
  name,
  hint,
  control,
}: {
  name: ReactNode;
  hint?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border-subtle py-3 last:border-b-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-text-primary">{name}</div>
        {hint && <div className="mt-1 text-text-muted text-xs leading-relaxed">{hint}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
