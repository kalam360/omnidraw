/**
 * Theme adaptation for Excalidraw inside Omnidraw.
 *
 * Excalidraw's hand-drawn aesthetic is intentionally preserved — we only
 * adjust the chrome (background, accent) so it sits naturally inside the
 * dark omnidraw shell.
 */

/** Cyan accent matching `--accent` in `styles/tokens.css`. */
export const OMNIDRAW_ACCENT = "#06b6d4";

/** Page background (`--bg-page`). */
export const OMNIDRAW_BG = "#08090a";

/** Default Excalidraw appState patch applied on mount. */
export const omnidrawAppStateDefaults = {
  // Excalidraw paints the canvas itself; this only matters for exported PNG/SVG
  // backgrounds. Keep it transparent so the canvas blends with the panel.
  viewBackgroundColor: "transparent",
  exportBackground: false,
  // Use Excalidraw's own dark theme — it matches the omnidraw blackboard look.
  theme: "dark" as const,
  // Hide the "made with excalidraw" stamp in exports — branding belongs to omnidraw.
  exportEmbedScene: false,
} as const;

/**
 * UIOptions passed to the upstream `<Excalidraw>` to strip out collab/Firebase
 * affordances (per the locked decisions doc). We keep the editor itself
 * untouched.
 */
export const omnidrawUIOptions = {
  canvasActions: {
    // Hide collab — we don't ship live multiplayer in v1.
    saveAsImage: true,
    saveToActiveFile: false,
    loadScene: false,
    export: false,
    toggleTheme: false,
    clearCanvas: true,
    changeViewBackgroundColor: false,
  },
  // No "Live collaboration" trigger.
  tools: {
    image: true,
  },
} as const;
