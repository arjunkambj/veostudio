"use client";

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Link,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { useMemo, useState } from "react";

import type {
  OrchestratorModel,
  RunManifest,
  SegmentPlanItem,
  VideoModel,
} from "@/lib/pipeline/types";

type PlanResponse = {
  source: "llm" | "heuristic";
  segments: SegmentPlanItem[];
};

type GenerateResponse = {
  projectId: string;
  runId: string;
  status: RunManifest["status"];
  manifest: RunManifest;
  manifestUrl: string;
  statusUrl: string;
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed");
  }

  return payload as T;
}

export default function VeoPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [orchestratorModel, setOrchestratorModel] =
    useState<OrchestratorModel>("gemini");
  const [videoModel, setVideoModel] = useState<VideoModel>("veo-3.1-fast");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [segmentPlan, setSegmentPlan] = useState<SegmentPlanItem[]>([]);
  const [planSource, setPlanSource] = useState<"llm" | "heuristic" | null>(
    null,
  );
  const [manifest, setManifest] = useState<RunManifest | null>(null);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canPlan = script.trim().length > 0 && !planning;
  const canGenerate = script.trim().length > 0 && !generating;

  const estimatedDuration = useMemo(() => {
    if (segmentPlan.length === 0) {
      return null;
    }

    const total = segmentPlan.reduce(
      (sum, segment) => sum + segment.targetSeconds,
      0,
    );

    return total;
  }, [segmentPlan]);

  async function ensureProjectId() {
    if (projectId) {
      return projectId;
    }

    const created = await requestJson<{ projectId: string }>("/api/projects", {
      method: "POST",
    });
    setProjectId(created.projectId);
    return created.projectId;
  }

  async function handlePlanSegments() {
    setPlanning(true);
    setErrorMessage(null);

    try {
      const payload = await requestJson<PlanResponse>("/api/segments/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, orchestratorModel }),
      });

      setSegmentPlan(payload.segments);
      setPlanSource(payload.source);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to plan",
      );
    } finally {
      setPlanning(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setErrorMessage(null);

    try {
      const currentProjectId = await ensureProjectId();
      const formData = new FormData();
      formData.set("script", script);
      formData.set("projectId", currentProjectId);
      formData.set("orchestratorModel", orchestratorModel);
      formData.set("videoModel", videoModel);

      for (const file of imageFiles) {
        formData.append("images", file, file.name);
      }

      const result = await requestJson<GenerateResponse>("/api/generate", {
        method: "POST",
        body: formData,
      });

      setLastRunId(result.runId);
      setManifest(result.manifest);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to generate clips",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-6 rounded-2xl p-4 md:p-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">Veo Studio</h2>
        <p className="text-sm text-muted-foreground">
          Generate 9:16 UGC clips from script + image references. Output is
          stored locally and generation logs are sent to Convex.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="block space-y-2">
            <span className="text-sm font-medium">Script</span>
            <Textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Paste ad script here..."
              className="min-h-44 w-full"
            />
          </div>

          <div className="block space-y-2">
            <span className="text-sm font-medium">Reference Images</span>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) =>
                setImageFiles(Array.from(event.target.files ?? []))
              }
              className="block w-full"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-">
              <span className="text-sm pr-4 font-medium">Orchestrator Model</span>
              <Tabs
                selectedKey={orchestratorModel}
                              aria-label="Orchestrator model"
                onSelectionChange={(key) => {
                  if (key === "gemini") {
                    setOrchestratorModel("gemini");
                  }
                }}
              >
                <Tab key="gemini" title="Gemini" />
                <Tab key="openai" title="OpenAI (Soon)" isDisabled />
              </Tabs>
              <p className="text-xs text-muted-foreground">
                OpenAI orchestrator is temporarily disabled.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Generation Model</span>
              <Tabs
                selectedKey={videoModel}
                
                aria-label="Generation model"
                onSelectionChange={(key) =>
                  setVideoModel(String(key) as VideoModel)
                }
              >
                <Tab key="veo-3.1-fast" title="Veo 3.1 Fast" />
                <Tab key="veo-3.1" title="Veo 3.1" />
              </Tabs>
              <p className="text-xs text-muted-foreground">
                Fast is lower latency. Veo 3.1 prioritizes higher visual
                quality.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="bordered"
              onPress={handlePlanSegments}
              isDisabled={!canPlan}
            >
              {planning ? "Planning..." : "Plan Segments"}
            </Button>
            <Button
              color="primary"
              onPress={handleGenerate}
              isDisabled={!canGenerate}
            >
              {generating ? "Generating Clips..." : "Generate Clips"}
            </Button>
          </div>

          {errorMessage ? (
            <Alert color="danger" description={errorMessage} />
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-col items-start">
              <h3 className="text-sm font-semibold">Planning Output</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Source: {planSource ?? "not generated yet"}
                {estimatedDuration
                  ? ` · Estimated duration: ${estimatedDuration}s`
                  : ""}
              </p>
            </CardHeader>
            <CardBody>
              <ol className="space-y-2 text-sm">
                {segmentPlan.length === 0 ? (
                  <li className="text-muted-foreground">
                    No segments planned yet.
                  </li>
                ) : (
                  segmentPlan.map((segment) => (
                    <li
                      key={segment.index}
                      className="rounded-lg border border-divider bg-content2 p-2"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Segment {segment.index} · {segment.targetSeconds}s
                      </p>
                      <p className="mt-1">{segment.text}</p>
                    </li>
                  ))
                )}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">Latest Run</h3>
            </CardHeader>
            <CardBody>
              {manifest ? (
                <div className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Run ID: {lastRunId} · Status: {manifest.status} · Models:{" "}
                    {manifest.selectedModels.orchestratorModel}/{" "}
                    {manifest.selectedModels.videoModel}
                  </p>

                  <ul className="space-y-2">
                    {manifest.segments.map((segment) => (
                      <li
                        key={segment.index}
                        className="rounded-lg border border-divider bg-content2 p-2"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Segment {segment.index} · {segment.status}
                        </p>
                        <p className="mt-1 line-clamp-2">{segment.text}</p>
                        {segment.downloadUrl ? (
                          <Link
                            className="mt-2 inline-block text-xs font-medium underline"
                            href={segment.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Clip
                          </Link>
                        ) : null}
                        {segment.error ? (
                          <Alert
                            className="mt-2"
                            color="danger"
                            description={segment.error}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No generation run yet.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
