import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Project, SceneRef, ThreadRef } from "@/contracts";
import { Badge, Button } from "@/ui";
import { CanvasPane } from "@/shell/CanvasPane";
import { SceneQueue } from "@/shell/SceneQueue";
import { useStorage } from "@/lib/adapters/adapters-context";

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const storage = useStorage();
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<SceneRef[]>([]);
  const [threads, setThreads] = useState<ThreadRef[]>([]);

  useEffect(() => {
    if (!projectId) return;
    storage.getProject(projectId).then(setProject);
    storage.listScenes(projectId).then(setScenes);
    storage.listThreads(projectId).then(setThreads);
  }, [storage, projectId]);

  if (!projectId || !project) {
    return <div className="flex flex-1 items-center justify-center text-text-muted text-sm">Loading…</div>;
  }

  const startThread = async () => {
    const t = await storage.createThread(projectId, { title: "New thread" });
    nav(`/projects/${projectId}/threads/${t.id}`);
  };

  return (
    <CanvasPane
      title={project.name}
      trailing={
        <>
          {scenes.length === 0 ? (
            <Badge>No scenes</Badge>
          ) : (
            <span className="text-text-muted text-xs">{scenes.length} scenes</span>
          )}
          <Button size="sm" variant="primary" onClick={startThread}>
            New thread
          </Button>
          {threads.length > 0 && (
            <Button
              size="sm"
              onClick={() => nav(`/projects/${projectId}/threads/${threads[0].id}`)}
            >
              Open latest thread
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-1 items-center justify-center bg-bg-page">
        {scenes.length === 0 ? (
          <div className="max-w-md text-center">
            <div className="mb-4 inline-block h-14 w-14 rounded-full border border-dashed border-border-default text-2xl leading-[3.5rem] text-text-subtle">
              +
            </div>
            <h3 className="text-text-primary text-xl font-semibold">No scenes yet</h3>
            <p className="mt-2 text-text-muted text-sm leading-relaxed">
              Ask the agent for a diagram. It will render on the canvas and save automatically.
            </p>
            <Button variant="primary" size="md" className="mt-4" onClick={startThread}>
              Start a thread
            </Button>
          </div>
        ) : (
          <div className="text-text-subtle text-sm">Select a scene below to open it.</div>
        )}
      </div>
      {scenes.length > 0 && <SceneQueue scenes={scenes} />}
    </CanvasPane>
  );
}
