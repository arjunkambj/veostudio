import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export function createProjectId() {
  return `proj_${randomUUID()}`;
}

export function createRunId() {
  return `run_${randomUUID()}`;
}

export function getStorageRootPath() {
  return STORAGE_ROOT;
}

export function getProjectPath(projectId: string) {
  return path.join(STORAGE_ROOT, "projects", projectId);
}

export function getRunPath(projectId: string, runId: string) {
  return path.join(getProjectPath(projectId), "runs", runId);
}

export function getRunSegmentsPath(projectId: string, runId: string) {
  return path.join(getRunPath(projectId, runId), "segments");
}

export function getRunInputsPath(projectId: string, runId: string) {
  return path.join(getRunPath(projectId, runId), "inputs");
}

export function getRunManifestPath(projectId: string, runId: string) {
  return path.join(getRunPath(projectId, runId), "manifest.json");
}

export async function ensureProjectRunDirs(projectId: string, runId: string) {
  await fs.mkdir(getRunInputsPath(projectId, runId), { recursive: true });
  await fs.mkdir(getRunSegmentsPath(projectId, runId), { recursive: true });
}

export function sanitizeLabel(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function withVersionSuffix(baseName: string, version: number) {
  if (version <= 1) {
    return baseName;
  }

  return `${baseName}-v${version}`;
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeBufferCollisionSafe(params: {
  dir: string;
  baseName: string;
  extension: string;
  buffer: Buffer;
}) {
  const { dir, baseName, extension, buffer } = params;
  await fs.mkdir(dir, { recursive: true });

  let version = 1;
  while (version < 1000) {
    const candidateBase = withVersionSuffix(baseName, version);
    const fileName = `${candidateBase}.${extension}`;
    const filePath = path.join(dir, fileName);
    const tempPath = `${filePath}.tmp-${randomUUID()}`;

    if (await exists(filePath)) {
      version += 1;
      continue;
    }

    await fs.writeFile(tempPath, buffer);

    try {
      await fs.rename(tempPath, filePath);
      return { fileName, filePath };
    } catch {
      await fs.rm(tempPath, { force: true });
      version += 1;
    }
  }

  throw new Error("Unable to persist artifact without name collision");
}

export async function writeJsonAtomic(filePath: string, data: unknown) {
  const tmpPath = `${filePath}.tmp-${randomUUID()}`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function writeTextAtomic(filePath: string, text: string) {
  const tmpPath = `${filePath}.tmp-${randomUUID()}`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, text, "utf8");
  await fs.rename(tmpPath, filePath);
}

export function hashForSegment(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

export function toRelativeWorkspacePath(filePath: string) {
  return path.relative(process.cwd(), filePath);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}
