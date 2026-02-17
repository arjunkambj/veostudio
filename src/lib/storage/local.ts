import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export function createProjectId() {
  return `proj_${randomUUID()}`;
}

export function createRunId() {
  return `run_${randomUUID()}`;
}

export function getRunSegmentsPath(projectId: string, runId: string) {
  return path.join(
    STORAGE_ROOT,
    "projects",
    projectId,
    "runs",
    runId,
    "segments",
  );
}

export async function ensureRunDirs(projectId: string, runId: string) {
  await fs.mkdir(getRunSegmentsPath(projectId, runId), { recursive: true });
}
