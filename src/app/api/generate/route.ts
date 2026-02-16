import path from "node:path";

import { NextResponse } from "next/server";

import {
  runClipGeneration,
  saveImageFiles,
  saveScript,
} from "@/lib/pipeline/run-generation";
import type { GenerationInput, VideoModel } from "@/lib/pipeline/types";
import {
  createProjectId,
  createRunId,
  ensureProjectRunDirs,
} from "@/lib/storage/local";

function isVideoModel(value: unknown): value is VideoModel {
  return value === "veo-3.1-fast" || value === "veo-3.1";
}

export const maxDuration = 300;

export async function POST(request: Request) {
  const formData = await request.formData();

  const script = (formData.get("script") as string | null)?.trim() ?? "";
  const videoValue = formData.get("videoModel");
  const projectId =
    (formData.get("projectId") as string | null)?.trim() || createProjectId();
  const runId = createRunId();

  // OpenAI orchestrator is intentionally disabled for now.
  const orchestratorModel = "gemini";
  const videoModel = isVideoModel(videoValue) ? videoValue : "veo-3.1-fast";

  if (!script) {
    return NextResponse.json({ error: "Script is required" }, { status: 400 });
  }

  await ensureProjectRunDirs(projectId, runId);

  const scriptPath = await saveScript({ projectId, runId, script });

  const uploadedImages = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);

  const imagePaths = await saveImageFiles({
    projectId,
    runId,
    files: uploadedImages,
  });

  const input: GenerationInput = {
    script,
    orchestratorModel,
    videoModel,
    imagePaths,
    projectId,
  };

  const manifest = await runClipGeneration({
    projectId,
    runId,
    input,
    scriptPath,
  });

  return NextResponse.json({
    projectId,
    runId,
    status: manifest.status,
    manifest,
    manifestUrl: `/api/projects/${projectId}/runs/${runId}/manifest`,
    statusUrl: `/api/projects/${projectId}/runs/${runId}`,
    outputDir: path.dirname(path.join(process.cwd(), manifest.scriptPath)),
  });
}
