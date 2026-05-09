import pkg from "../../package.json";

export default function BrandShell() {
  return (
    <main className="min-h-screen bg-bg-page text-text-body font-sans flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block w-3 h-3 rounded-full bg-accent shadow-[0_0_24px_var(--color-accent)]"
        />
        <h1 className="text-text-primary text-2xl font-semibold tracking-tight">
          omnidraw
        </h1>
      </div>

      <p className="mt-3 text-text-muted text-sm">
        Foundation in place. Teams take over from here.
      </p>

      <section className="mt-10 flex items-center gap-3" aria-label="primitive demo">
        {/* Button */}
        <button
          type="button"
          className="px-4 py-2 rounded-3 bg-accent text-bg-page text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Button
        </button>

        {/* Input */}
        <input
          type="text"
          placeholder="Input"
          className="px-3 py-2 rounded-3 bg-bg-surface border border-border-default text-text-primary placeholder:text-text-subtle text-sm focus:border-accent focus:outline-none transition-colors"
        />

        {/* Badge */}
        <span className="inline-flex items-center px-2 py-1 rounded-2 bg-bg-surface border border-border-subtle text-text-muted text-xs">
          Badge
        </span>
      </section>

      <footer className="mt-12 text-text-subtle text-xs font-mono">
        omnidraw-desktop v{pkg.version}
      </footer>
    </main>
  );
}
