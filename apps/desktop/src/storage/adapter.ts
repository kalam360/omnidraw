import path from "node:path";
import { homedir } from "node:os";

import type BetterSqlite3 from "better-sqlite3";

import type {
  Project,
  Scene,
  SceneRef,
  StorageAdapter,
  Thread,
  ThreadRef,
} from "../contracts/storage.js";
import type { ChatMessage } from "../contracts/chat.js";
import { StorageNotFoundError } from "./errors.js";

import { openDatabase, type DbHandle } from "./db.js";
import {
  atomicWriteFile,
  ensureDir,
  readFileUtf8,
  removeDir,
  removeFile,
} from "./files.js";
import { createId, slugify } from "./ids.js";
import { generateThumbnail } from "./thumbnails.js";

// Widen prepared-statement type to variadic so .run/.get/.all accept any
// number of args; we don't need per-statement bind tuples here.
type Stmt = BetterSqlite3.Statement<unknown[], unknown>;

export interface CreateStorageOptions {
  /** Absolute base path. Defaults to ~/omnidraw. */
  rootPath?: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  path: string;
  created_at: string;
  updated_at: string;
}

interface SceneRow {
  id: string;
  project_id: string;
  title: string;
  filename: string;
  thumbnail: string | null;
  updated_at: string;
}

interface ThreadRow {
  id: string;
  project_id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: string | null;
  created_at: string;
}

interface CountRow {
  c: number;
}

const SCENE_EXT = ".excalidraw";

function nowIso(): string {
  return new Date().toISOString();
}

export class SqliteStorageAdapter implements StorageAdapter {
  private readonly handle: DbHandle;
  private readonly rootPath: string;

  // Prepared statements (lazy-initialized in constructor).
  private readonly sql: {
    insertProject: Stmt;
    selectProject: Stmt;
    selectAllProjects: Stmt;
    updateProjectName: Stmt;
    deleteProject: Stmt;
    countScenesByProject: Stmt;
    countThreadsByProject: Stmt;
    upsertScene: Stmt;
    selectScenesByProject: Stmt;
    selectScene: Stmt;
    deleteScene: Stmt;
    insertThread: Stmt;
    selectThreadsByProject: Stmt;
    selectThread: Stmt;
    deleteThread: Stmt;
    insertMessage: Stmt;
    bumpThread: Stmt;
    selectMessagesByThread: Stmt;
    upsertSetting: Stmt;
    selectSetting: Stmt;
  };

  constructor(opts: CreateStorageOptions = {}) {
    this.rootPath = opts.rootPath ?? path.join(homedir(), "omnidraw");
    this.handle = openDatabase(path.join(this.rootPath, "library.db"));

    const db = this.handle.db;
    this.sql = {
      insertProject: db.prepare(
        `INSERT INTO projects (id, name, description, path, created_at, updated_at)
         VALUES (@id, @name, @description, @path, @created_at, @updated_at)`,
      ),
      selectProject: db.prepare(`SELECT * FROM projects WHERE id = ?`),
      selectAllProjects: db.prepare(
        `SELECT * FROM projects ORDER BY updated_at DESC`,
      ),
      updateProjectName: db.prepare(
        `UPDATE projects SET name = ?, updated_at = ? WHERE id = ?`,
      ),
      deleteProject: db.prepare(`DELETE FROM projects WHERE id = ?`),
      countScenesByProject: db.prepare(
        `SELECT COUNT(*) AS c FROM scenes WHERE project_id = ?`,
      ),
      countThreadsByProject: db.prepare(
        `SELECT COUNT(*) AS c FROM threads WHERE project_id = ?`,
      ),
      upsertScene: db.prepare(
        `INSERT INTO scenes (id, project_id, title, filename, thumbnail, updated_at)
         VALUES (@id, @project_id, @title, @filename, @thumbnail, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           filename = excluded.filename,
           thumbnail = excluded.thumbnail,
           updated_at = excluded.updated_at`,
      ),
      selectScenesByProject: db.prepare(
        `SELECT * FROM scenes WHERE project_id = ? ORDER BY updated_at DESC`,
      ),
      selectScene: db.prepare(
        `SELECT * FROM scenes WHERE project_id = ? AND id = ?`,
      ),
      deleteScene: db.prepare(
        `DELETE FROM scenes WHERE project_id = ? AND id = ?`,
      ),
      insertThread: db.prepare(
        `INSERT INTO threads (id, project_id, title, message_count, updated_at)
         VALUES (@id, @project_id, @title, 0, @updated_at)`,
      ),
      selectThreadsByProject: db.prepare(
        `SELECT * FROM threads WHERE project_id = ? ORDER BY updated_at DESC`,
      ),
      selectThread: db.prepare(`SELECT * FROM threads WHERE id = ?`),
      deleteThread: db.prepare(`DELETE FROM threads WHERE id = ?`),
      insertMessage: db.prepare(
        `INSERT INTO messages (id, thread_id, role, content, tool_calls, created_at)
         VALUES (@id, @thread_id, @role, @content, @tool_calls, @created_at)`,
      ),
      bumpThread: db.prepare(
        `UPDATE threads SET message_count = message_count + 1, updated_at = ? WHERE id = ?`,
      ),
      selectMessagesByThread: db.prepare(
        `SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC`,
      ),
      upsertSetting: db.prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ),
      selectSetting: db.prepare(`SELECT value FROM settings WHERE key = ?`),
    };
  }

  /** Tear down the underlying DB handle. */
  close(): void {
    this.handle.close();
  }

  /** Absolute path to the workspace root. Useful for tests. */
  get root(): string {
    return this.rootPath;
  }

  // ---------- Projects ----------

  async listProjects(): Promise<Project[]> {
    const rows = this.sql.selectAllProjects.all() as ProjectRow[];
    return rows.map((row) => this.hydrateProject(row));
  }

  async getProject(id: string): Promise<Project | null> {
    const row = this.sql.selectProject.get(id) as ProjectRow | undefined;
    return row ? this.hydrateProject(row) : null;
  }

  async createProject(input: {
    name: string;
    description?: string;
  }): Promise<Project> {
    const id = createId();
    const slug = slugify(input.name);
    const folderName = `${slug}-${id}`;
    const projectPath = path.join(this.rootPath, "projects", folderName);
    const now = nowIso();

    await ensureDir(path.join(projectPath, "scenes"));
    await ensureDir(path.join(projectPath, "thumbnails"));
    await atomicWriteFile(
      path.join(projectPath, "project.json"),
      JSON.stringify(
        {
          id,
          name: input.name,
          description: input.description ?? null,
          createdAt: now,
        },
        null,
        2,
      ),
    );

    this.sql.insertProject.run({
      id,
      name: input.name,
      description: input.description ?? null,
      path: projectPath,
      created_at: now,
      updated_at: now,
    });

    return this.hydrateProject({
      id,
      name: input.name,
      description: input.description ?? null,
      path: projectPath,
      created_at: now,
      updated_at: now,
    });
  }

  async renameProject(id: string, name: string): Promise<Project> {
    const row = this.sql.selectProject.get(id) as ProjectRow | undefined;
    if (!row) throw new StorageNotFoundError("project", id);
    const now = nowIso();
    this.sql.updateProjectName.run(name, now, id);

    // Update mirror file (best effort).
    try {
      await atomicWriteFile(
        path.join(row.path, "project.json"),
        JSON.stringify(
          {
            id,
            name,
            description: row.description,
            createdAt: row.created_at,
          },
          null,
          2,
        ),
      );
    } catch {}

    return this.hydrateProject({ ...row, name, updated_at: now });
  }

  async deleteProject(id: string): Promise<void> {
    const row = this.sql.selectProject.get(id) as ProjectRow | undefined;
    if (!row) return;
    this.sql.deleteProject.run(id);
    await removeDir(row.path);
  }

  // ---------- Scenes ----------

  async listScenes(projectId: string): Promise<SceneRef[]> {
    const rows = this.sql.selectScenesByProject.all(projectId) as SceneRow[];
    return rows.map((row) => this.toSceneRef(row));
  }

  async getScene(projectId: string, sceneId: string): Promise<Scene> {
    const row = this.sql.selectScene.get(projectId, sceneId) as
      | SceneRow
      | undefined;
    if (!row) throw new StorageNotFoundError("scene", sceneId);
    const project = this.sql.selectProject.get(projectId) as
      | ProjectRow
      | undefined;
    if (!project) throw new StorageNotFoundError("project", projectId);

    const filePath = path.join(project.path, "scenes", row.filename);
    const raw = await readFileUtf8(filePath);
    const parsed = JSON.parse(raw) as {
      elements: Scene["elements"];
      appState?: Scene["appState"];
    };

    return {
      ...this.toSceneRef(row),
      elements: parsed.elements ?? [],
      appState: parsed.appState,
    };
  }

  async saveScene(projectId: string, scene: Scene): Promise<SceneRef> {
    const project = this.sql.selectProject.get(projectId) as
      | ProjectRow
      | undefined;
    if (!project) throw new StorageNotFoundError("project", projectId);

    const id = scene.id || createId();
    const filename = `${id}${SCENE_EXT}`;
    const filePath = path.join(project.path, "scenes", filename);
    const now = nowIso();

    const body = JSON.stringify(
      {
        type: "excalidraw",
        version: 2,
        source: "omnidraw-desktop",
        elements: scene.elements ?? [],
        appState: scene.appState ?? {},
      },
      null,
      2,
    );

    await atomicWriteFile(filePath, body);
    const thumbnail = await generateThumbnail({ ...scene, id });

    this.sql.upsertScene.run({
      id,
      project_id: projectId,
      title: scene.title || "Untitled",
      filename,
      thumbnail,
      updated_at: now,
    });

    return {
      id,
      title: scene.title || "Untitled",
      filename,
      thumbnail: thumbnail ?? undefined,
      updatedAt: now,
    };
  }

  async deleteScene(projectId: string, sceneId: string): Promise<void> {
    const row = this.sql.selectScene.get(projectId, sceneId) as
      | SceneRow
      | undefined;
    if (!row) return;
    const project = this.sql.selectProject.get(projectId) as
      | ProjectRow
      | undefined;
    this.sql.deleteScene.run(projectId, sceneId);
    if (project) {
      await removeFile(path.join(project.path, "scenes", row.filename));
      if (row.thumbnail) {
        await removeFile(path.join(project.path, row.thumbnail));
      }
    }
  }

  // ---------- Threads ----------

  async listThreads(projectId: string): Promise<ThreadRef[]> {
    const rows = this.sql.selectThreadsByProject.all(projectId) as ThreadRow[];
    return rows.map((row) => this.toThreadRef(row));
  }

  async getThread(threadId: string): Promise<Thread> {
    const row = this.sql.selectThread.get(threadId) as ThreadRow | undefined;
    if (!row) throw new StorageNotFoundError("thread", threadId);
    const messageRows = this.sql.selectMessagesByThread.all(
      threadId,
    ) as MessageRow[];
    const messages: ChatMessage[] = messageRows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.tool_calls
        ? (JSON.parse(m.tool_calls) as ChatMessage["toolCalls"])
        : undefined,
      createdAt: m.created_at,
    }));
    return { ...this.toThreadRef(row), messages };
  }

  async createThread(
    projectId: string,
    input: { title?: string },
  ): Promise<ThreadRef> {
    const project = this.sql.selectProject.get(projectId) as
      | ProjectRow
      | undefined;
    if (!project) throw new StorageNotFoundError("project", projectId);
    const id = createId();
    const now = nowIso();
    this.sql.insertThread.run({
      id,
      project_id: projectId,
      title: input.title ?? "New thread",
      updated_at: now,
    });
    return {
      id,
      title: input.title ?? "New thread",
      messageCount: 0,
      updatedAt: now,
    };
  }

  async deleteThread(threadId: string): Promise<void> {
    this.sql.deleteThread.run(threadId);
  }

  /** Hot path. Single transaction, single insert + thread bump. */
  async appendMessage(threadId: string, msg: ChatMessage): Promise<void> {
    const now = msg.createdAt || nowIso();
    const tx = this.handle.db.transaction(() => {
      this.sql.insertMessage.run({
        id: msg.id || createId(),
        thread_id: threadId,
        role: msg.role,
        content: msg.content,
        tool_calls: msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
        created_at: now,
      });
      this.sql.bumpThread.run(now, threadId);
    });
    tx();
  }

  // ---------- Settings ----------

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const row = this.sql.selectSetting.get(key) as
      | { value: string }
      | undefined;
    if (!row) return null;
    return JSON.parse(row.value) as T;
  }

  async setSetting<T = unknown>(key: string, value: T): Promise<void> {
    this.sql.upsertSetting.run(key, JSON.stringify(value));
  }

  // ---------- helpers ----------

  private hydrateProject(row: ProjectRow): Project {
    const sceneCount =
      (this.sql.countScenesByProject.get(row.id) as CountRow | undefined)?.c ??
      0;
    const threadCount =
      (this.sql.countThreadsByProject.get(row.id) as CountRow | undefined)?.c ??
      0;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      path: row.path,
      sceneCount,
      threadCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toSceneRef(row: SceneRow): SceneRef {
    return {
      id: row.id,
      title: row.title,
      filename: row.filename,
      thumbnail: row.thumbnail ?? undefined,
      updatedAt: row.updated_at,
    };
  }

  private toThreadRef(row: ThreadRow): ThreadRef {
    return {
      id: row.id,
      title: row.title,
      messageCount: row.message_count,
      updatedAt: row.updated_at,
    };
  }
}
