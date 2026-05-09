import { ONBOARDING_STEPS, stepIndex, type OnboardingStep } from "../steps";
import { cn } from "@/lib/utils";

export function StepIndicator({ current }: { current: OnboardingStep }) {
  const currentIndex = stepIndex(current);
  return (
    <div className="mt-6 flex justify-center gap-1.5" aria-label={`Step ${currentIndex + 1} of ${ONBOARDING_STEPS.length}`}>
      {ONBOARDING_STEPS.map((step, i) => (
        <span
          key={step}
          className={cn(
            "h-1.5 w-8 rounded-pill transition-colors",
            i < currentIndex && "bg-accent/60",
            i === currentIndex && "bg-accent-bright",
            i > currentIndex && "bg-border-default",
          )}
        />
      ))}
    </div>
  );
}
