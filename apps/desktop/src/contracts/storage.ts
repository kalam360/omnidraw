/** Implemented by the Storage team. Consumed by Frontend, Agent, Canvas. */
export interface StorageAdapter {
  // Projects (folders on disk)
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(input: { name: string; description?: string }): Promise<Project>;
  renameProject(id: string, name: string): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Scenes (.excalidraw files in project folder)
  listScenes(projectId: string): Promise<SceneRef[]>;
  getScene(projectId: string, sceneId: string): Promise<Scene>;
  saveScene(projectId: string, scene: Scene): Promise<SceneRef>;
  deleteScene(projectId: string, sceneId: string): Promise<void>;

  // Threads (chat conversation, in SQLite)
  listThreads(projectId: string): Promise<ThreadRef[]>;
  getThread(threadId: string): Promise<Thread>;
  appendMessage(threadId: string, msg: import("./chat").ChatMessage): Promise<void>;
  createThread(projectId: string, input: { title?: string }): Promise<ThreadRef>;
  deleteThread(threadId: string): Promise<void>;

  // Settings (per-app)
  getSetting<T = unknown>(key: string): Promise<T | null>;
  setSetting<T = unknown>(key: string, value: T): Promise<void>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  path: string; // absolute path on disk
  sceneCount: number;
  threadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneRef {
  id: string;
  title: string;
  filename: string;
  thumbnail?: string; // data URL
  updatedAt: string;
}

export interface Scene extends SceneRef {
  elements: import("@excalidraw/element/types").ExcalidrawElement[];
  appState?: Record<string, unknown>;
}

export interface ThreadRef {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export interface Thread extends ThreadRef {
  messages: import("./chat").ChatMessage[];
}
