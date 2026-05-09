/**
 * Placeholder for the Canvas team's <OmnidrawCanvas/>. During the integration
 * phase this default export will be swapped to import from `@/canvas/...`.
 *
 * The Suspense boundary in `routes/Session.tsx` and `presentation/PresentationMode.tsx`
 * intentionally lazy-loads this module so the Excalidraw bundle is only paid
 * for on routes that need it.
 *
 * For the purposes of stub-adapter dev fuel we render a static SVG that
 * roughly matches the prototype's "forward + backward pass" diagram.
 */
import type { ExcalidrawElement } from "@excalidraw/element/types";

export interface OmnidrawCanvasProps {
  projectId: string;
  sceneId?: string;
  elements?: ExcalidrawElement[];
  /** When true, hide chrome and zoom-fit for presentation mode. */
  presentMode?: boolean;
}

export default function OmnidrawCanvas({ presentMode }: OmnidrawCanvasProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg-page" data-testid="canvas-stage">
      <svg
        viewBox="0 0 800 460"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full max-h-[80vh] max-w-[90%] [&_.stroke]:fill-none [&_.stroke]:stroke-text-body [&_.stroke]:[stroke-width:1.5] [&_.label]:fill-text-primary [&_.label]:[font-family:var(--font-hand,'Caveat',cursive)] [&_.label]:[font-size:18px] [&_.muted]:fill-text-muted [&_.arrow]:fill-none [&_.arrow]:stroke-accent-bright [&_.arrow]:[stroke-width:1.5]"
        aria-label="Backprop diagram"
      >
        {/* forward pass */}
        <rect className="stroke" x="60" y="60" width="120" height="60" rx="6" />
        <text className="label" x="120" y="96" textAnchor="middle">
          x · input
        </text>
        <rect className="stroke" x="240" y="60" width="120" height="60" rx="6" />
        <text className="label" x="300" y="96" textAnchor="middle">
          W·x + b
        </text>
        <rect className="stroke" x="420" y="60" width="120" height="60" rx="6" />
        <text className="label" x="480" y="96" textAnchor="middle">
          σ(z)
        </text>
        <rect className="stroke" x="600" y="60" width="120" height="60" rx="6" />
        <text className="label" x="660" y="96" textAnchor="middle">
          ŷ
        </text>
        <path className="arrow" d="M180 90 L240 90" markerEnd="url(#arrow)" />
        <path className="arrow" d="M360 90 L420 90" markerEnd="url(#arrow)" />
        <path className="arrow" d="M540 90 L600 90" markerEnd="url(#arrow)" />
        {/* loss */}
        <rect className="stroke" x="320" y="320" width="160" height="60" rx="6" />
        <text className="label" x="400" y="356" textAnchor="middle">
          L(ŷ, y)
        </text>
        <path className="arrow" d="M400 320 L660 130" markerEnd="url(#arrow)" />
        {/* backwards arrows */}
        <path className="arrow" d="M660 130 C 600 230, 520 230, 480 130" markerEnd="url(#arrow)" />
        <path className="arrow" d="M480 130 C 420 230, 340 230, 300 130" markerEnd="url(#arrow)" />
        <path className="arrow" d="M300 130 C 240 230, 160 230, 120 130" markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {!presentMode && (
          <text className="muted" x="400" y="450" textAnchor="middle" style={{ fontSize: 11 }}>
            stub canvas — Canvas team's OmnidrawCanvas swaps in during integration
          </text>
        )}
      </svg>
    </div>
  );
}
