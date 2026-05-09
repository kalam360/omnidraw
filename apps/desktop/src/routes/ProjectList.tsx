import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@/ui";
import { useStorage } from "@/lib/adapters/adapters-context";
import { useProjectsStore } from "@/lib/stores/projects";

export default function ProjectListRoute() {
  const storage = useStorage();
  const projects = useProjectsStore((s) => s.projects);
  const setProjects = useProjectsStore((s) => s.setProjects);
  const loaded = useProjectsStore((s) => s.loaded);
  const nav = useNavigate();

  useEffect(() => {
    storage.listProjects().then(setProjects);
  }, [storage, setProjects]);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-muted text-sm">Loading…</div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg-page p-12">
        <div className="max-w-md text-center">
          <div className="mb-4 inline-block h-16 w-16 rounded-full border border-dashed border-border-default text-3xl leading-[3.75rem] text-text-subtle">
            ▣
          </div>
          <h2 className="text-text-primary text-2xl font-semibold">No projects yet</h2>
          <p className="mt-2 text-text-muted text-sm leading-relaxed">
            Create a project to start drawing. Each project is a folder of scenes and chat threads.
          </p>
          <Button variant="primary" size="lg" className="mt-5" onClick={() => nav("/projects/new")}>
            Create your first project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-bg-page">
      <header className="flex h-11 items-center gap-3 border-b border-border-subtle px-4">
        <span className="text-text-primary text-sm font-medium">All projects</span>
        <Button size="sm" variant="primary" className="ml-auto" onClick={() => nav("/projects/new")}>
          New project
        </Button>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => nav(`/projects/${p.id}`)}
              className="text-left transition-colors"
            >
              <Card className="h-full hover:border-border-strong hover:bg-bg-surface-hover">
                <h3 className="text-text-primary text-lg font-semibold">{p.name}</h3>
                {p.description && (
                  <p className="mt-1 text-text-muted text-xs leading-relaxed">{p.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-text-subtle text-xs">
                  <span>{p.sceneCount} scenes</span>
                  <span>·</span>
                  <span>{p.threadCount} threads</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
