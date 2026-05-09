import type { SceneRef } from "@/contracts";
import { Kbd } from "@/ui";
import { cn } from "@/lib/utils";

export function SceneStrip({
  scenes,
  activeSceneId,
  onSelect,
}: {
  scenes: SceneRef[];
  activeSceneId?: string;
  onSelect: (sceneId: string) => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 overflow-x-auto bg-[rgba(15,16,17,0.85)] px-4 py-2 backdrop-blur">
      {scenes.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            "flex h-12 w-16 shrink-0 items-center justify-center rounded-2 border bg-bg-surface text-text-muted text-xs",
            s.id === activeSceneId
              ? "border-accent text-accent-bright"
              : "border-border-subtle hover:border-border-default",
          )}
        >
          <span className="font-mono">{i + 1}</span>
        </button>
      ))}
      <span className="ml-auto self-center text-text-muted text-xs">
        <Kbd>←</Kbd> <Kbd>→</Kbd> Navigate · <Kbd>F</Kbd> Fullscreen · <Kbd>?</Kbd> Help
      </span>
    </div>
  );
}
