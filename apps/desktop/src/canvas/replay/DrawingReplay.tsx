/**
 * `DrawingReplay` — element-by-element morphdom replay for assistant-ui
 * tool-call cards.
 *
 * Adapted from CopilotKit/excalidraw-studio's `mcp-app.tsx` (MIT). The
 * studio variant lives inside an MCP iframe; ours is a plain React
 * component sized for an `assistant-ui` tool-call card.
 *
 * See `LICENSES.md` for attribution.
 */

import { useEffect, useRef, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { play, type ReplayEvent } from "./replay";

export type { ReplayEvent } from "./replay";

export interface DrawingReplayProps {
  /** Stream of element events from the agent sidecar. */
  stream: AsyncIterable<ReplayEvent>;
  /** Card width in CSS pixels. Defaults to 360. */
  width?: number;
  /** Card height in CSS pixels. Defaults to 240. */
  height?: number;
  /** Per-element pacing. Default 200ms — matches the studio reference. */
  elementDelayMs?: number;
  /** Called once the stream completes. */
  onDone?: (info: { frames: number; elements: number }) => void;
  /** Optional className for the card wrapper. */
  className?: string;
}

export function DrawingReplay({
  stream,
  width = 360,
  height = 240,
  elementDelayMs,
  onDone,
  className,
}: DrawingReplayProps) {
  // morphdom mutates this div's children — React must NOT re-render it.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      try {
        const [{ exportToSvg }, morphdomMod] = await Promise.all([
          import("@excalidraw/excalidraw"),
          import("morphdom"),
        ]);
        const morphdom = (morphdomMod.default ?? morphdomMod) as (
          from: Node,
          to: Node | string,
          options?: { childrenOnly?: boolean },
        ) => Node;

        const result = await play(
          wrapper,
          stream,
          exportToSvg as never,
          morphdom,
          { elementDelayMs, signal: controller.signal },
        );
        if (cancelled) return;
        setDone(true);
        onDone?.(result);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // We intentionally subscribe once per stream instance — re-running on
    // every render would re-consume the iterator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  return (
    <div
      className={
        className ??
        "rounded-3 border border-border-default bg-bg-panel overflow-hidden"
      }
      style={{ width, height }}
      role="img"
      aria-label={done ? "Drawing complete" : "Drawing in progress"}
      aria-busy={!done && !error}
    >
      {error ? (
        <div className="grid place-items-center w-full h-full text-danger text-sm">
          Replay failed: {error}
        </div>
      ) : (
        <div ref={wrapperRef} className="w-full h-full" />
      )}
    </div>
  );
}

/** Helper for tests / mocks: turn an array into an async iterable stream. */
export async function* eventsFromArray<T extends ExcalidrawElement>(
  elements: T[],
): AsyncIterable<ReplayEvent> {
  for (const element of elements) {
    yield { kind: "element", element };
  }
  yield { kind: "done" };
}
