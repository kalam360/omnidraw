import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Project, ThreadRef } from "@/contracts";
import { Button } from "@/ui";
import { useStorage } from "@/lib/adapters/adapters-context";
import { useProjectsStore } from "@/lib/stores/projects";
import { ProjectList } from "./ProjectList";
import { ThreadList } from "./ThreadList";
import { ConnectionBadge } from "./ConnectionBadge";

export function Sidebar() {
  const storage = useStorage();
  const navigate = useNavigate();
  const projects = useProjectsStore((s) => s.projects);
  const setProjects = useProjectsStore((s) => s.setProjects);
  const params = useParams<{ projectId?: string }>();
  const [threads, setThreads] = useState<ThreadRef[]>([]);

  useEffect(() => {
    storage.listProjects().then((p: Project[]) => setProjects(p));
  }, [storage, setProjects]);

  useEffect(() => {
    if (!params.projectId) {
      setThreads([]);
      return;
    }
    storage.listThreads(params.projectId).then(setThreads);
  }, [storage, params.projectId]);

  return (
    <aside
      className="flex h-full w-[240px] shrink-0 flex-col border-r border-border-subtle bg-bg-panel"
      aria-label="Primary navigation"
    >
      <div className="flex h-11 items-center justify-between border-b border-border-subtle px-3">
        <NavLink to="/projects" className="flex items-center gap-2 text-text-primary text-sm font-semibold">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          omnidraw
        </NavLink>
        <Button size="sm" icon variant="ghost" aria-label="New project" onClick={() => navigate("/projects/new")}>
          +
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-1 px-3 text-text-subtle text-xs font-medium uppercase tracking-wider">Projects</div>
        <ProjectList projects={projects} />

        {params.projectId && (
          <>
            <div className="mt-5 mb-1 px-3 text-text-subtle text-xs font-medium uppercase tracking-wider">Threads</div>
            <ThreadList projectId={params.projectId} threads={threads} />
          </>
        )}
      </div>

      <div className="border-t border-border-subtle p-2">
        <NavLink
          to="/settings"
          className="flex h-8 items-center gap-3 rounded-3 px-3 text-sm font-medium text-text-muted transition-colors hover:bg-bg-input-hover hover:text-text-body"
        >
          <span aria-hidden className="h-4 w-4 shrink-0 text-center">⚙</span>
          Settings
        </NavLink>
        <ConnectionBadge />
      </div>
    </aside>
  );
}
