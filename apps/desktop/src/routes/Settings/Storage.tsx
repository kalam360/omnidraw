import { useState } from "react";
import { Button, Toggle } from "@/ui";
import { SettingsRow, SettingsSection } from "./index";

export default function Storage() {
  const [autoSave, setAutoSave] = useState(true);
  return (
    <SettingsSection
      title="Storage"
      description="Where Omnidraw stores projects, scenes, and conversation threads."
    >
      <SettingsRow
        name="Workspace folder"
        hint={<span className="font-mono">~/omnidraw/projects/</span>}
        control={<Button size="sm">Choose…</Button>}
      />
      <SettingsRow
        name="Auto-save scenes"
        hint="Save scenes after every tool call. Disable for manual control."
        control={<Toggle checked={autoSave} onChange={setAutoSave} aria-label="Auto-save" />}
      />
    </SettingsSection>
  );
}
