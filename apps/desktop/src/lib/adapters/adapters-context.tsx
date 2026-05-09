import { createContext, useContext, type ReactNode } from "react";
import type {
  AuthAdapter,
  CanvasController,
  ChatModelAdapter,
  SkillRegistry,
  StorageAdapter,
} from "@/contracts";
import { stubAuthAdapter } from "./stub-auth";
import { stubCanvasController } from "./stub-canvas";
import { stubChatAdapter } from "./stub-chat";
import { stubSkillRegistry } from "./stub-skills";
import { stubStorageAdapter } from "./stub-storage";

export interface Adapters {
  auth: AuthAdapter;
  canvas: CanvasController;
  chat: ChatModelAdapter;
  skills: SkillRegistry;
  storage: StorageAdapter;
}

export const defaultAdapters: Adapters = {
  auth: stubAuthAdapter,
  canvas: stubCanvasController,
  chat: stubChatAdapter,
  skills: stubSkillRegistry,
  storage: stubStorageAdapter,
};

const AdaptersCtx = createContext<Adapters>(defaultAdapters);

export function AdaptersProvider({
  value = defaultAdapters,
  children,
}: {
  value?: Adapters;
  children: ReactNode;
}) {
  return <AdaptersCtx.Provider value={value}>{children}</AdaptersCtx.Provider>;
}

export function useAdapters(): Adapters {
  return useContext(AdaptersCtx);
}

export function useAuth() {
  return useAdapters().auth;
}
export function useChat() {
  return useAdapters().chat;
}
export function useStorage() {
  return useAdapters().storage;
}
export function useCanvas() {
  return useAdapters().canvas;
}
export function useSkills() {
  return useAdapters().skills;
}
