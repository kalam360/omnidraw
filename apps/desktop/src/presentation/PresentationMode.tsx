import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Project, SceneRef } from "@/contracts";
import { Kbd } from "@/ui";
import { useStorage } from "@/lib/adapters/adapters-context";
import { HudTop } from "./HudTop";
import { SceneStrip } from "./SceneStrip";
import { usePresentationHotkeys } from "./hotkeys";

const OmnidrawCanvas = lazy(() => import("@/shell/OmnidrawCanvas"));

export default function PresentationMode() {
  const { projectId } = useParams<{ projectId: string }>();
  const storage = useStorage();
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<SceneRef[]>([]);
  const [index, setIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    storage.getProject(projectId).then(setProject);
    storage.listScenes(projectId).then(setScenes);
  }, [projectId, storage]);

  const exit = () => projectId && nav(`/projects/${projectId}`);

  usePresentationHotkeys({
    onPrev: () => setIndex((i) => Math.max(i - 1, 0)),
    onNext: () => setIndex((i) => Math.min(i + 1, Math.max(scenes.length - 1, 0))),
    onExit: exit,
    onToggleHelp: () => setShowHelp((v) => !v),
    onToggleFullscreen: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    },
  });

  if (!project) {
    return <div className="flex h-full items-center justify-center text-text-muted text-sm">Loading…</div>;
  }

  const active = scenes[index];

  return (
    <div className="relative flex h-screen w-screen flex-col bg-bg-page">
      <HudTop
        current={index + 1}
        total={Math.max(scenes.length, 1)}
        title={project.name}
        onExit={exit}
      />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-text-subtle text-sm">
            Loading canvas…
          </div>
        }
      >
        <OmnidrawCanvas projectId={project.id} sceneId={active?.id} presentMode />
      </Suspense>
      {scenes.length > 0 && (
        <SceneStrip
          scenes={scenes}
          activeSceneId={active?.id}
          onSelect={(id) => setIndex(scenes.findIndex((s) => s.id === id))}
        />
      )}
      {showHelp && (
        <div
          role="dialog"
          aria-label="Hotkey help"
          className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(8,9,10,0.85)]"
          onClick={() => setShowHelp(false)}
        >
          <div className="rounded-4 border border-border-strong bg-bg-panel p-6 text-sm text-text-body">
            <h3 className="mb-3 text-text-primary text-base font-semibold">Hotkeys</h3>
            <ul className="space-y-2">
              <li><Kbd>←</Kbd> <Kbd>→</Kbd> Navigate scenes</li>
              <li><Kbd>F</Kbd> Toggle fullscreen</li>
              <li><Kbd>esc</Kbd> Exit presentation</li>
              <li><Kbd>?</Kbd> Toggle this help</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
