import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingShell } from "@/onboarding/OnboardingShell";
import { StepIndicator } from "@/onboarding/components/StepIndicator";
import { Alert, Button, Input } from "@/ui";
import { useAuth } from "@/lib/adapters/adapters-context";

export default function Connect() {
  const nav = useNavigate();
  const auth = useAuth();
  const [showKeyEntry, setShowKeyEntry] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startDeviceFlow = () => nav("/connecting");

  const submitKey = async () => {
    setError(null);
    const r = await auth.storeKey(apiKey);
    if (r.ok) nav("/projects/new");
    else setError(r.reason);
  };

  return (
    <OnboardingShell>
      <div className="mb-3 text-xs font-medium uppercase tracking-widest text-text-muted">
        step 2 · connect
      </div>
      <h2 className="text-text-primary text-2xl font-semibold tracking-tight">
        Connect your Omnizen account
      </h2>
      <p className="mt-3 text-text-muted text-sm leading-relaxed">
        Omnidraw routes all generation through{" "}
        <a href="https://omnizen.ai" target="_blank" rel="noreferrer">
          Omnizen
        </a>
        , which provides access to DeepSeek, Kimi, GLM, Qwen, and MiniMax under a single
        subscription.
      </p>

      <Button
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        onClick={startDeviceFlow}
      >
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-bg-page" />
        Connect with Omnizen →
      </Button>
      <p className="mt-2 text-center text-text-muted text-xs">
        Opens omnizen.ai in your browser. We'll bring you back in a few seconds.
      </p>

      <Divider>OR</Divider>

      <details open={showKeyEntry} onToggle={(e) => setShowKeyEntry((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer list-none py-2 text-text-muted text-sm font-medium">
          I already have an API key →
        </summary>
        <div className="mt-3">
          <label htmlFor="key-input" className="mb-2 block text-text-muted text-xs font-medium uppercase tracking-wider">
            Omnizen API key
          </label>
          <Input
            id="key-input"
            type="password"
            placeholder="omn_live_…"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
          <p className="mt-2 text-text-muted text-xs">
            Issue a key from{" "}
            <a href="https://omnizen.ai/dashboard/keys" target="_blank" rel="noreferrer">
              omnizen.ai/dashboard/keys
            </a>
            . Stored in your OS keychain.
          </p>
          {error && (
            <p className="mt-2 text-[var(--danger)] text-xs">{error}</p>
          )}
          <Button size="lg" className="mt-3 w-full" onClick={submitKey}>
            Verify and continue
          </Button>
        </div>
      </details>

      <Alert
        className="mt-3"
        variant="info"
        icon="ℹ"
        title="Don't have an account?"
        description={
          <>
            <a href="https://omnizen.ai/sign-up" target="_blank" rel="noreferrer">
              Sign up for free
            </a>{" "}
            — includes $1 in credit, no card required.
          </>
        }
      />

      <div className="mt-5 flex gap-2">
        <Button variant="ghost" size="lg" className="flex-1" onClick={() => nav("/welcome")}>
          Back
        </Button>
        <Button variant="ghost" size="lg" className="flex-1" onClick={() => nav("/projects/new")}>
          Skip
        </Button>
      </div>

      <StepIndicator current="connect" />
    </OnboardingShell>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3 text-text-subtle text-xs">
      <span className="h-px flex-1 bg-border-subtle" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
