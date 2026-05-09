import { Select } from "@/ui";
import { SettingsRow, SettingsSection } from "./index";

export default function Model() {
  return (
    <SettingsSection
      title="Model"
      description="Choose which Omnizen-routed model handles your prompts."
    >
      <SettingsRow
        name="Active model"
        hint="DeepSeek tends to draw cleaner diagrams; Kimi excels at long-form explanations."
        control={
          <Select defaultValue="deepseek-v4-pro" className="w-56">
            <option value="deepseek-v4-pro">deepseek-v4-pro</option>
            <option value="deepseek-v4-flash">deepseek-v4-flash</option>
            <option value="kimi-k2">kimi-k2</option>
            <option value="glm-5">glm-5</option>
            <option value="qwen-3.5">qwen-3.5</option>
          </Select>
        }
      />
    </SettingsSection>
  );
}
