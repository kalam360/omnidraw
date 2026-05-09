import { NavLink } from "react-router-dom";
import type { Project } from "@/contracts";
import { cn } from "@/lib/utils";

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <nav aria-label="Projects" className="flex flex-col gap-0.5">
      {projects.map((p) => (
        <NavLink
          key={p.id}
          to={`/projects/${p.id}`}
          className={({ isActive }) =>
            cn(
              "flex h-8 items-center gap-3 rounded-3 px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-bg-surface-hover text-text-primary"
                : "text-text-muted hover:bg-bg-input-hover hover:text-text-body",
            )
          }
        >
          <span aria-hidden className="h-4 w-4 shrink-0 text-center">▣</span>
          <span className="flex-1 truncate">{p.name}</span>
          <span className="text-text-subtle text-xs">{p.sceneCount}</span>
        </NavLink>
      ))}
    </nav>
  );
}
