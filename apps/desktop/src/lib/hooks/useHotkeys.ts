import { useEffect, useRef } from "react";

export type HotkeyHandler = (e: KeyboardEvent) => void;

export interface HotkeyMap {
  [combo: string]: HotkeyHandler | undefined;
}

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function comboKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("mod");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  // normalise key
  let k = e.key;
  if (k === " ") k = "Space";
  if (k.length === 1) k = k.toLowerCase();
  if (k === ",") k = ",";
  parts.push(k);
  return parts.join("+");
}

/**
 * Register a hotkey map. Combo keys use "mod+k", "shift+/", "Escape" syntax.
 * Hotkeys are disabled while focus is in a text input/textarea/contentEditable.
 */
export function useHotkeys(map: HotkeyMap, opts: { enableInInputs?: boolean } = {}) {
  const ref = useRef(map);
  ref.current = map;
  const { enableInInputs = false } = opts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!enableInInputs && isEditable(e.target)) return;
      const combo = comboKey(e);
      const handler = ref.current[combo];
      if (handler) {
        handler(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableInInputs]);
}
