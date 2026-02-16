import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { getRunSegmentsPath } from "@/lib/storage/local";

function isSafeFileName(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ projectId: string; runId: string; clipFile: string }>;
  },
) {
  const { projectId, runId, clipFile } = await context.params;

  if (!isSafeFileName(clipFile)) {
    return NextResponse.json({ error: "Invalid clip file" }, { status: 400 });
  }

  const clipPath = path.join(getRunSegmentsPath(projectId, runId), clipFile);

  try {
    const buffer = await fs.readFile(clipPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="${clipFile}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }
}
