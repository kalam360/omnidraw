import { create } from "zustand";
import type { ThreadRef } from "@/contracts";

interface ThreadsState {
  threadsByProject: Record<string, ThreadRef[]>;
  setThreads: (projectId: string, threads: ThreadRef[]) => void;
}

export const useThreadsStore = create<ThreadsState>((set) => ({
  threadsByProject: {},
  setThreads: (projectId, threads) =>
    set((s) => ({ threadsByProject: { ...s.threadsByProject, [projectId]: threads } })),
}));
