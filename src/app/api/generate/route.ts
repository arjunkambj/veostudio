import { NextResponse } from "next/server";

import { runClipGeneration } from "@/lib/pipeline/run-generation";
import type { AspectRatio, VideoModel } from "@/lib/pipeline/types";
import {
  createProjectId,
  createRunId,
  ensureRunDirs,
} from "@/lib/storage/local";

function isVideoModel(value: unknown): value is VideoModel {
  return value === "veo-3.1-fast" || value === "veo-3.1";
}

function isAspectRatio(value: unknown): value is AspectRatio {
  return value === "9:16" || value === "16:9";
}

export const maxDuration = 300;

export async function POST(request: Request) {
  const formData = await request.formData();

  const script = (formData.get("script") as string | null)?.trim() ?? "";
  const videoModel = isVideoModel(formData.get("videoModel"))
    ? (formData.get("videoModel") as VideoModel)
    : "veo-3.1-fast";
  const aspectRatio = isAspectRatio(formData.get("aspectRatio"))
    ? (formData.get("aspectRatio") as AspectRatio)
    : "9:16";

  if (!script) {
    return NextResponse.json({ error: "Script is required" }, { status: 400 });
  }

  const projectId = createProjectId();
  const runId = createRunId();
  await ensureRunDirs(projectId, runId);

  const imageFiles = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);

  const manifest = await runClipGeneration({
    projectId,
    runId,
    script,
    videoModel,
    aspectRatio,
    imageFiles,
  });

  return NextResponse.json({ projectId, runId, manifest });
}
