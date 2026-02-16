import { NextResponse } from "next/server";

import { createSegmentPlan } from "@/lib/pipeline/segmenter";
import type { OrchestratorModel } from "@/lib/pipeline/types";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const script =
    typeof payload?.script === "string" ? payload.script.trim() : "";
  // OpenAI orchestrator is intentionally disabled for now.
  const orchestratorModel: OrchestratorModel = "gemini";

  if (!script) {
    return NextResponse.json({ error: "Script is required" }, { status: 400 });
  }

  const plan = await createSegmentPlan({ script, orchestratorModel });

  return NextResponse.json(plan);
}
