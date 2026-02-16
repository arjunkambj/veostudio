import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  generationRuns: defineTable({
    projectId: v.string(),
    runId: v.string(),
    status: v.string(),
    orchestratorModel: v.string(),
    videoModel: v.string(),
    scriptPreview: v.string(),
    referenceImageCount: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_run", ["runId"]),

  generationEvents: defineTable({
    projectId: v.string(),
    runId: v.string(),
    level: v.union(v.literal("info"), v.literal("error")),
    stage: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
  }).index("by_run", ["runId"]),
});
