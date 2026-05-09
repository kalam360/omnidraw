import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingShell } from "@/onboarding/OnboardingShell";
import { StepIndicator } from "@/onboarding/components/StepIndicator";
import { Button, Input, Textarea } from "@/ui";
import { useStorage } from "@/lib/adapters/adapters-context";

export default function CreateProject() {
  const storage = useStorage();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const p = await storage.createProject({ name: name.trim(), description: description.trim() || undefined });
    setBusy(false);
    nav(`/projects/${p.id}`);
  };

  return (
    <OnboardingShell>
      <div className="mb-3 text-xs font-medium uppercase tracking-widest text-text-muted">
        step 3 · create project
      </div>
      <h2 className="text-text-primary text-2xl font-semibold tracking-tight">
        Name your first project
      </h2>
      <p className="mt-3 text-text-muted text-sm leading-relaxed">
        Projects are folders on disk. Each project holds scenes (.excalidraw files) and chat
        threads. You can rename or move it later.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="proj-name" className="mb-2 block text-text-muted text-xs font-medium uppercase tracking-wider">
            Project name
          </label>
          <Input
            id="proj-name"
            placeholder="e.g. Linear Algebra 101"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="proj-desc" className="mb-2 block text-text-muted text-xs font-medium uppercase tracking-wider">
            Description <span className="text-text-subtle normal-case">(optional)</span>
          </label>
          <Textarea
            id="proj-desc"
            placeholder="What's this project for?"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="ghost" size="lg" className="flex-1" onClick={() => nav("/connect")}>
          Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={create}
          disabled={busy || !name.trim()}
        >
          Create project →
        </Button>
      </div>

      <StepIndicator current="create-project" />
    </OnboardingShell>
  );
}
