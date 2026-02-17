import { NextResponse } from "next/server";

import { createSegmentPlan } from "@/lib/pipeline/segmenter";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const script =
    typeof payload?.script === "string" ? payload.script.trim() : "";

  if (!script) {
    return NextResponse.json({ error: "Script is required" }, { status: 400 });
  }

  const plan = await createSegmentPlan(script);
  return NextResponse.json(plan);
}
