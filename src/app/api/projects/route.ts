import { NextResponse } from "next/server";

import {
  createProjectId,
  createRunId,
  ensureProjectRunDirs,
  getStorageRootPath,
} from "@/lib/storage/local";

export async function POST() {
  const projectId = createProjectId();
  const runId = createRunId();

  await ensureProjectRunDirs(projectId, runId);

  return NextResponse.json({
    projectId,
    runId,
    storageRoot: getStorageRootPath(),
  });
}
