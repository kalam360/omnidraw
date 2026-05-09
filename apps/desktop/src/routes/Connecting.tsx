import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingShell } from "@/onboarding/OnboardingShell";
import { Button, Spinner, StatusDot } from "@/ui";
import { useAuth } from "@/lib/adapters/adapters-context";

export default function Connecting() {
  const auth = useAuth();
  const nav = useNavigate();
  const [userCode, setUserCode] = useState<string>("…");
  const [verificationUri, setVerificationUri] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await auth.startConnect();
      if (cancelled) return;
      setUserCode(r.userCode);
      setVerificationUri(r.verificationUriComplete);
      const final = await auth.awaitConnect();
      if (cancelled) return;
      if (final.kind === "approved") nav("/projects/new");
      else nav("/connect");
    })();
    return () => {
      cancelled = true;
      auth.cancelConnect();
    };
  }, [auth, nav]);

  return (
    <OnboardingShell>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-text-muted">
        <StatusDot status="connecting" /> Awaiting approval
      </div>
      <h2 className="text-text-primary text-2xl font-semibold tracking-tight">
        Confirm in your browser
      </h2>
      <p className="mt-3 text-text-muted text-sm leading-relaxed">
        We've opened omnizen.ai in your browser. Verify the code below matches what you see
        there, then click <strong className="text-text-primary">Approve</strong>.
      </p>

      <div className="my-6 flex items-center justify-center rounded-4 border border-border-default bg-bg-input py-6">
        <span className="font-mono text-3xl tracking-[0.3em] text-accent-bright">{userCode}</span>
      </div>

      <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
        <Spinner /> Listening for approval…
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          variant="ghost"
          size="lg"
          className="flex-1"
          onClick={() => {
            auth.cancelConnect();
            nav("/connect");
          }}
        >
          Cancel
        </Button>
        {verificationUri && (
          <a
            href={verificationUri}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-3 border border-border-default bg-bg-input px-4 text-sm font-medium text-text-body hover:bg-bg-input-hover"
          >
            Open browser again
          </a>
        )}
      </div>
    </OnboardingShell>
  );
}
