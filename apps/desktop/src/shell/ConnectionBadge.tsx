import { StatusDot } from "@/ui";
import { useConnectionStore } from "@/lib/stores/connection";

export function ConnectionBadge() {
  const status = useConnectionStore((s) => s.status);
  const model = useConnectionStore((s) => s.model);

  const dotStatus =
    status === "connected" ? "success" : status === "connecting" ? "connecting" : status === "error" ? "danger" : "default";

  const label =
    status === "connected"
      ? model ?? "Connected"
      : status === "connecting"
        ? "Connecting…"
        : status === "error"
          ? "Disconnected from Omnizen"
          : "Not connected";

  return (
    <span
      className="flex items-center gap-3 rounded-3 px-3 py-1.5 text-text-muted text-sm"
      data-status={status}
    >
      <StatusDot status={dotStatus} />
      <span className="truncate">{label}</span>
    </span>
  );
}
