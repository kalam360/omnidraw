export type OnboardingStep = "welcome" | "connect" | "create-project";

export const ONBOARDING_STEPS: OnboardingStep[] = ["welcome", "connect", "create-project"];

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}
