import type { SegmentPlanItem, VideoModel } from "./types";

export function buildSegmentPrompt(params: {
  segment: SegmentPlanItem;
  imageLabels: string[];
  videoModel: VideoModel;
}) {
  const { segment, imageLabels, videoModel } = params;

  const imageHint =
    imageLabels.length > 0
      ? `Reference identity/style images: ${imageLabels.join(", ")}. Preserve same face identity, hairstyle, outfit tone, and room style.`
      : "No reference image provided. Keep a consistent single UGC creator identity.";

  const qualityHint =
    videoModel === "veo-3.1-fast"
      ? "Prioritize fast generation while keeping realistic face and lip sync."
      : "Prioritize maximum realism, stable facial identity and natural mouth movement.";

  return [
    "Create one vertical UGC talking-head ad clip for a Meta reel.",
    "Output format: 9:16 portrait, smartphone-style camera framing, chest-up composition.",
    "Single speaker to camera, natural handheld feel, indoor soft lighting.",
    imageHint,
    qualityHint,
    `Narration line to speak exactly: ${segment.text}`,
    `Target duration around ${segment.targetSeconds} seconds.`,
    `Continuity requirements: ${segment.continuityNotes}`,
    "Avoid jump cuts, avoid face changes, no subtitles burned into the video.",
  ].join(" ");
}
