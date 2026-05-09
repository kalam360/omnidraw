import {
  mkdir,
  readFile,
  writeFile,
  unlink,
  rename,
  rm,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/** Ensure a directory exists, creating parents as needed. */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/**
 * Atomic write: stream to a unique tmp path then rename into place.
 * On most OSes `rename` is atomic when source and dest live on the same
 * filesystem (we always do, since tmp sits next to the target).
 */
export async function atomicWriteFile(
  filePath: string,
  data: string | Uint8Array,
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmp = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, filePath);
  } catch (err) {
    // best-effort cleanup; ignore if tmp wasn't created.
    try {
      await unlink(tmp);
    } catch {}
    throw err;
  }
}

export async function readFileUtf8(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function removeFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (err: any) {
    if (err && err.code !== "ENOENT") throw err;
  }
}

export async function removeDir(dirPath: string): Promise<void> {
  await rm(dirPath, { recursive: true, force: true });
}

export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    return await readdir(dirPath);
  } catch (err: any) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}
