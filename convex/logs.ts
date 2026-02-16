import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const createProjectLog = mutation({
  args: {
    projectId: v.string(),
    runId: v.string(),
    selectedModels: v.object({
      orchestratorModel: v.string(),
      videoModel: v.string(),
    }),
    scriptPreview: v.string(),
    referenceImageCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query("generationRuns")
      .withIndex("by_run", (queryBuilder) =>
        queryBuilder.eq("runId", args.runId),
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("generationRuns", {
      projectId: args.projectId,
      runId: args.runId,
      status: "queued",
      orchestratorModel: args.selectedModels.orchestratorModel,
      videoModel: args.selectedModels.videoModel,
      scriptPreview: args.scriptPreview,
      referenceImageCount: args.referenceImageCount,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setJobState = mutation({
  args: {
    projectId: v.string(),
    runId: v.string(),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("generationRuns")
      .withIndex("by_run", (queryBuilder) =>
        queryBuilder.eq("runId", args.runId),
      )
      .first();

    if (!run) {
      return null;
    }

    await ctx.db.patch(run._id, {
      status: args.status,
      errorMessage: args.errorMessage,
      updatedAt: new Date().toISOString(),
    });

    return run._id;
  },
});

export const appendJobEvent = mutation({
  args: {
    projectId: v.string(),
    runId: v.string(),
    level: v.union(v.literal("info"), v.literal("error")),
    stage: v.string(),
    message: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generationEvents", {
      projectId: args.projectId,
      runId: args.runId,
      level: args.level,
      stage: args.stage,
      message: args.message,
      metadata: args.metadata,
      createdAt: new Date().toISOString(),
    });
  },
});

export const listProjectRuns = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generationRuns")
      .withIndex("by_project", (queryBuilder) =>
        queryBuilder.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(25);
  },
});
