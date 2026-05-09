import { useState } from "react";
import { Toggle, Select } from "@/ui";
import { SettingsRow, SettingsSection } from "./index";

export default function Appearance() {
  const [reducedMotion, setReducedMotion] = useState(false);
  return (
    <SettingsSection
      title="Appearance"
      description="omnidraw is dark-only by design — chalk on a blackboard."
    >
      <SettingsRow
        name="Theme"
        hint="Light mode is intentionally not supported."
        control={
          <Select defaultValue="dark" disabled className="w-40">
            <option value="dark">Dark</option>
          </Select>
        }
      />
      <SettingsRow
        name="Reduce motion"
        hint="Disable canvas transitions and pulse animations."
        control={<Toggle checked={reducedMotion} onChange={setReducedMotion} aria-label="Reduce motion" />}
      />
    </SettingsSection>
  );
}
