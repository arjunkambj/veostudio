import { NextResponse } from "next/server";

import {
  getSystemPrompts,
  saveSystemPrompts,
} from "@/lib/config/system-prompts";

export async function GET() {
  const prompts = await getSystemPrompts();
  return NextResponse.json(prompts);
}

export async function PUT(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  try {
    const saved = await saveSystemPrompts(payload);
    return NextResponse.json(saved);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save system prompts";

    if (message.startsWith("Invalid prompt configuration")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to save system prompts" },
      { status: 500 },
    );
  }
}
