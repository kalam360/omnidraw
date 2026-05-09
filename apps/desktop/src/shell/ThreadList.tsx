import { NavLink } from "react-router-dom";
import type { ThreadRef } from "@/contracts";
import { cn } from "@/lib/utils";

export function ThreadList({ projectId, threads }: { projectId: string; threads: ThreadRef[] }) {
  if (threads.length === 0) return null;
  return (
    <nav aria-label="Threads" className="flex flex-col gap-0.5">
      {threads.map((t) => (
        <NavLink
          key={t.id}
          to={`/projects/${projectId}/threads/${t.id}`}
          className={({ isActive }) =>
            cn(
              "flex h-8 items-center gap-3 rounded-3 px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-bg-surface-hover text-text-primary"
                : "text-text-muted hover:bg-bg-input-hover hover:text-text-body",
            )
          }
        >
          <span aria-hidden className="h-4 w-4 shrink-0 text-center">◰</span>
          <span className="flex-1 truncate">{t.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
