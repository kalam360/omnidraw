import { Badge, Button, StatusDot } from "@/ui";
import { SettingsRow, SettingsSection } from "./index";
import { useAuth } from "@/lib/adapters/adapters-context";
import { useConnectionStore } from "@/lib/stores/connection";

export default function Connection() {
  const auth = useAuth();
  const status = useConnectionStore((s) => s.status);
  const setStatus = useConnectionStore((s) => s.setStatus);

  return (
    <SettingsSection
      title="Connection"
      description="Omnidraw routes generation through Omnizen. The key is stored in your OS keychain."
    >
      <SettingsRow
        name="Omnizen account"
        hint={status === "connected" ? "Connected." : "Not yet connected."}
        control={
          <Badge variant={status === "connected" ? "success" : "default"}>
            <StatusDot status={status === "connected" ? "success" : "default"} />
            {status === "connected" ? "Connected" : "Disconnected"}
          </Badge>
        }
      />
      <SettingsRow
        name="API key"
        hint="Stored in your OS keychain."
        control={
          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              await auth.disconnect();
              setStatus("disconnected");
            }}
          >
            Disconnect
          </Button>
        }
      />
    </SettingsSection>
  );
}
