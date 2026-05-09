import { useHotkeys } from "@/lib/hooks/useHotkeys";

export interface PresentationHotkeyOpts {
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onToggleHelp: () => void;
  onToggleFullscreen: () => void;
}

export function usePresentationHotkeys(opts: PresentationHotkeyOpts) {
  useHotkeys({
    ArrowLeft: opts.onPrev,
    ArrowRight: opts.onNext,
    Escape: opts.onExit,
    "?": opts.onToggleHelp,
    f: opts.onToggleFullscreen,
  });
}
