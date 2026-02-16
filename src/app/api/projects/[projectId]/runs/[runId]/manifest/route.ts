import { NextResponse } from "next/server";

import { loadManifest } from "@/lib/pipeline/run-generation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; runId: string }> },
) {
  const { projectId, runId } = await context.params;

  try {
    const manifest = await loadManifest(projectId, runId);
    return NextResponse.json(manifest);
  } catch {
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }
}
