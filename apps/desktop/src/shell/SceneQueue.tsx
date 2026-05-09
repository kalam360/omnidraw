import type { SceneRef } from "@/contracts";
import { cn } from "@/lib/utils";

export interface SceneQueueProps {
  scenes: SceneRef[];
  activeSceneId?: string;
  onSelect?: (sceneId: string) => void;
  onAdd?: () => void;
}

export function SceneQueue({ scenes, activeSceneId, onSelect, onAdd }: SceneQueueProps) {
  return (
    <div
      role="tablist"
      aria-label="Scenes"
      className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-border-subtle bg-bg-panel px-4 py-3"
    >
      {scenes.map((s, i) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={s.id === activeSceneId}
          onClick={() => onSelect?.(s.id)}
          className={cn(
            "relative flex h-16 w-24 shrink-0 items-center justify-center rounded-3 border bg-bg-surface text-text-muted text-xs transition-colors hover:bg-bg-surface-hover",
            s.id === activeSceneId
              ? "border-accent text-accent-bright"
              : "border-border-subtle",
          )}
        >
          <span className="absolute left-1.5 top-1 text-[10px] font-mono text-text-subtle">
            {i + 1}
          </span>
          <span className="line-clamp-1 px-2 text-center">{s.title}</span>
        </button>
      ))}
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3 border border-dashed border-border-default bg-transparent text-text-subtle text-xl transition-colors hover:border-accent hover:text-accent-bright"
          aria-label="Add scene"
        >
          +
        </button>
      )}
    </div>
  );
}
