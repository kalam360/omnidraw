import { create } from "zustand";

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  model: string | null;
  setStatus: (s: ConnectionStatus) => void;
  setModel: (m: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "disconnected",
  model: null,
  setStatus: (status) => set({ status }),
  setModel: (model) => set({ model }),
}));
