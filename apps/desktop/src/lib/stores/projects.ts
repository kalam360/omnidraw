import { create } from "zustand";
import type { Project } from "@/contracts";

interface ProjectsState {
  projects: Project[];
  loaded: boolean;
  setProjects: (p: Project[]) => void;
  upsert: (p: Project) => void;
  remove: (id: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  loaded: false,
  setProjects: (projects) => set({ projects, loaded: true }),
  upsert: (p) =>
    set((state) => {
      const idx = state.projects.findIndex((x) => x.id === p.id);
      if (idx === -1) return { projects: [p, ...state.projects] };
      const next = state.projects.slice();
      next[idx] = p;
      return { projects: next };
    }),
  remove: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
}));
