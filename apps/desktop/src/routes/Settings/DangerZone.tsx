import { Button } from "@/ui";
import { SettingsRow, SettingsSection } from "./index";

export default function DangerZone() {
  return (
    <SettingsSection title="Danger zone" description="Irreversible — proceed carefully.">
      <SettingsRow
        name="Delete all projects"
        hint="Removes every .excalidraw file and chat thread from your workspace folder."
        control={<Button size="sm" variant="danger">Delete everything</Button>}
      />
      <SettingsRow
        name="Reset Omnidraw"
        hint="Wipes the keychain entry, settings, and local cache. Restarts onboarding."
        control={<Button size="sm" variant="danger">Reset</Button>}
      />
    </SettingsSection>
  );
}
