"use client";

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Link,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { useMemo, useState } from "react";

import type {
  AspectRatio,
  RunManifest,
  SegmentPlanItem,
  VideoModel,
} from "@/lib/pipeline/types";
import ImageUpload from "../_components/image-upload";

type PlanResponse = {
  source: "llm" | "heuristic";
  segments: SegmentPlanItem[];
};

type GenerateResponse = {
  projectId: string;
  runId: string;
  manifest: RunManifest;
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed");
  }

  return payload as T;
}

const segmentStatusColor: Record<string, "default" | "success" | "danger"> = {
  generated: "success",
  failed: "danger",
};

const segmentBorderColor: Record<string, string> = {
  generated: "border-l-success",
  failed: "border-l-danger",
};

export default function VeoPage() {
  const [script, setScript] = useState("");
  const [videoModel, setVideoModel] = useState<VideoModel>("veo-3.1-fast");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
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
    if (segmentPlan.length === 0) return null;
    return segmentPlan.reduce((sum, s) => sum + s.targetSeconds, 0);
  }, [segmentPlan]);

  async function handlePlanSegments() {
    setPlanning(true);
    setErrorMessage(null);

    try {
      const payload = await requestJson<PlanResponse>("/api/segments/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
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
      const formData = new FormData();
      formData.set("script", script);
      formData.set("videoModel", videoModel);
      formData.set("aspectRatio", aspectRatio);

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
      <header className="space-y-1 border-b border-divider pb-4">
        <h2 className="text-2xl font-semibold">Veo Studio</h2>
        <p className="text-sm text-default-500">
          Generate UGC-style vertical video clips from ad scripts
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="block space-y-2">
            <span className="text-sm font-medium">Script</span>
            <Textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Paste ad script here..."
              minRows={6}
              className="w-full"
            />
          </div>

          <ImageUpload files={imageFiles} onChange={setImageFiles} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-sm pr-2 font-medium">Generation Model</span>
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
            </div>

            <div className="space-y-1">
              <span className="text-sm pr-2 font-medium">Aspect Ratio</span>
              <Tabs
                selectedKey={aspectRatio}
                aria-label="Aspect ratio"
                onSelectionChange={(key) =>
                  setAspectRatio(String(key) as AspectRatio)
                }
              >
                <Tab key="9:16" title="9:16 (Vertical)" />
                <Tab key="16:9" title="16:9 (Landscape)" />
              </Tabs>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="bordered"
              onPress={handlePlanSegments}
              isDisabled={!canPlan}
              isLoading={planning}
            >
              Plan Segments
            </Button>
            <Button
              color="primary"
              onPress={handleGenerate}
              isDisabled={!canGenerate}
              isLoading={generating}
            >
              Generate Clips
            </Button>
          </div>

          {errorMessage ? (
            <Alert color="danger" description={errorMessage} />
          ) : null}
        </div>

        <div className="space-y-4">
          <Card shadow="sm">
            <CardHeader className="flex-col items-start">
              <h3 className="text-sm font-semibold">Planning Output</h3>
              {planSource && (
                <p className="mt-1 text-xs text-default-500">
                  Source: {planSource}
                  {estimatedDuration
                    ? ` · Estimated duration: ${estimatedDuration}s`
                    : ""}
                </p>
              )}
            </CardHeader>
            <CardBody>
              {segmentPlan.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-default-400">
                    No segments planned yet
                  </p>
                  <p className="mt-1 text-xs text-default-300">
                    Paste a script and click Plan Segments to get started
                  </p>
                </div>
              ) : (
                <ol className="space-y-2 text-sm">
                  {segmentPlan.map((segment) => (
                    <li
                      key={segment.index}
                      className="rounded-lg border border-divider bg-content2 p-2"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
                        Segment {segment.index} · {segment.targetSeconds}s
                      </p>
                      <p className="mt-1">{segment.text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          <Card shadow="sm">
            <CardHeader>
              <h3 className="text-sm font-semibold">Latest Run</h3>
            </CardHeader>
            <CardBody>
              {manifest ? (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-default-500">
                    <span>Run: {lastRunId}</span>
                    <Chip
                      size="sm"
                      color={
                        manifest.status === "completed" ? "success" : "danger"
                      }
                      variant="flat"
                    >
                      {manifest.status}
                    </Chip>
                    <span>{manifest.videoModel}</span>
                  </div>

                  <ul className="space-y-2">
                    {manifest.segments.map((segment) => (
                      <li
                        key={segment.index}
                        className={`rounded-lg border border-divider border-l-3 ${segmentBorderColor[segment.status] ?? ""} bg-content2 p-2`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
                            Segment {segment.index}
                          </p>
                          <Chip
                            size="sm"
                            color={
                              segmentStatusColor[segment.status] ?? "default"
                            }
                            variant="flat"
                          >
                            {segment.status}
                          </Chip>
                        </div>
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
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-default-400">
                    No generation run yet
                  </p>
                  <p className="mt-1 text-xs text-default-300">
                    Click Generate Clips to start creating video segments
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
