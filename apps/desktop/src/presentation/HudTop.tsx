import { Kbd } from "@/ui";

export function HudTop({
  current,
  total,
  title,
  onExit,
}: {
  current: number;
  total: number;
  title: string;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
      <button
        onClick={onExit}
        className="flex items-center gap-2 text-text-muted text-sm hover:text-text-body"
      >
        <Kbd>esc</Kbd> Exit presentation
      </button>
      <span className="text-text-muted text-sm">
        <span className="text-text-primary font-medium">{current}</span> / {total} · {title}
      </span>
    </div>
  );
}
