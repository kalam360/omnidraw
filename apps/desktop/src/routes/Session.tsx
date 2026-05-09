import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Project, SceneRef, ThreadRef } from "@/contracts";
import { Badge, Button } from "@/ui";
import { CanvasPane } from "@/shell/CanvasPane";
import { ChatPane } from "@/shell/ChatPane";
import { SceneQueue } from "@/shell/SceneQueue";
import { SkillPicker } from "@/shell/SkillPicker";
import { useStorage } from "@/lib/adapters/adapters-context";
import { useHotkeys } from "@/lib/hooks/useHotkeys";

// Lazy-load the canvas (Excalidraw is heavy; routes that don't need it
// shouldn't pay the bundle cost).
const OmnidrawCanvas = lazy(() => import("@/shell/OmnidrawCanvas"));

export default function Session() {
  const { projectId, threadId } = useParams<{ projectId: string; threadId: string }>();
  const storage = useStorage();
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [thread, setThread] = useState<ThreadRef | null>(null);
  const [scenes, setScenes] = useState<SceneRef[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | undefined>();
  const [skillId, setSkillId] = useState<string | undefined>();
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);

  useEffect(() => {
    if (!projectId || !threadId) return;
    storage.getProject(projectId).then(setProject);
    storage.listScenes(projectId).then((s) => {
      setScenes(s);
      setActiveSceneId(s[0]?.id);
    });
    storage.getThread(threadId).then((t) =>
      setThread({ id: t.id, title: t.title, messageCount: t.messageCount, updatedAt: t.updatedAt }),
    );
  }, [storage, projectId, threadId]);

  useHotkeys({
    "f": () => projectId && nav(`/projects/${projectId}/present`),
    "mod+k": (e) => {
      e.preventDefault();
      setSkillPickerOpen(true);
    },
    "mod+n": async (e) => {
      e.preventDefault();
      if (!projectId) return;
      const t = await storage.createThread(projectId, { title: "New thread" });
      nav(`/projects/${projectId}/threads/${t.id}`);
    },
    "mod+,": (e) => {
      e.preventDefault();
      nav("/settings");
    },
  });

  if (!projectId || !threadId || !project || !thread) {
    return <div className="flex flex-1 items-center justify-center text-text-muted text-sm">Loading…</div>;
  }

  const activeScene = scenes.find((s) => s.id === activeSceneId);

  return (
    <>
      <div className="flex h-full min-w-0 flex-1">
        <CanvasPane
          title={activeScene?.title ?? project.name}
          trailing={
            <>
              {scenes.length > 0 && (
                <span className="text-text-muted text-xs">
                  Scene {Math.max(scenes.findIndex((s) => s.id === activeSceneId) + 1, 1)} of{" "}
                  {scenes.length}
                </span>
              )}
              {scenes.length === 0 && <Badge>No scenes</Badge>}
              <Button size="sm" variant="ghost">Export</Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => nav(`/projects/${projectId}/present`)}
              >
                ▶ Present
              </Button>
            </>
          }
        >
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center text-text-subtle text-sm">
                Loading canvas…
              </div>
            }
          >
            <OmnidrawCanvas projectId={projectId} sceneId={activeSceneId} />
          </Suspense>
          {scenes.length > 0 && (
            <SceneQueue scenes={scenes} activeSceneId={activeSceneId} onSelect={setActiveSceneId} />
          )}
        </CanvasPane>
        <ChatPane
          threadId={threadId}
          threadTitle={thread.title}
          onOpenSkillPicker={() => setSkillPickerOpen(true)}
          selectedSkillId={skillId}
        />
      </div>
      <SkillPicker
        open={skillPickerOpen}
        onClose={() => setSkillPickerOpen(false)}
        onSelect={(s) => {
          setSkillId(s.id);
          setSkillPickerOpen(false);
        }}
      />
    </>
  );
}
