import { useNavigate } from "react-router-dom";
import { OnboardingShell, Eyebrow } from "@/onboarding/OnboardingShell";
import { StepIndicator } from "@/onboarding/components/StepIndicator";
import { Button, Kbd } from "@/ui";

export default function Welcome() {
  const nav = useNavigate();
  return (
    <OnboardingShell>
      <Eyebrow>omnidraw</Eyebrow>
      <h1 className="text-text-primary text-3xl font-semibold tracking-tight">
        Welcome to Omnidraw
      </h1>
      <p className="mt-3 text-text-muted text-sm leading-relaxed">
        Generate teaching diagrams from natural language, refine them on the canvas, and
        present live. Built for educators running live sessions.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <FeatureTile icon="◰" title="Generate from chat">
          Describe what you need; the canvas updates in real time.
        </FeatureTile>
        <FeatureTile icon="▶" title="Built for live sessions">
          Press <Kbd>F</Kbd> for fullscreen. Use <Kbd>←</Kbd>
          <Kbd>→</Kbd> to navigate scenes.
        </FeatureTile>
      </div>

      <div className="mt-6">
        <Button variant="primary" size="lg" className="w-full" onClick={() => nav("/connect")}>
          Get started →
        </Button>
      </div>

      <StepIndicator current="welcome" />
    </OnboardingShell>
  );
}

function FeatureTile({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3 border border-border-subtle bg-bg-input p-4">
      <div className="mb-1 text-xl text-accent-bright">{icon}</div>
      <div className="mb-0.5 text-sm font-medium text-text-primary">{title}</div>
      <div className="text-text-muted text-xs leading-relaxed">{children}</div>
    </div>
  );
}
