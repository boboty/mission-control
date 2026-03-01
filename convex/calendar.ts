import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("calendarItems").collect();
    return rows.sort((a, b) => a.startAt - b.startAt);
  }
});

export const create = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    owner: v.union(v.literal("user"), v.literal("assistant")),
    itemType: v.union(v.literal("scheduled"), v.literal("cron")),
    status: v.union(v.literal("planned"), v.literal("running"), v.literal("done"), v.literal("paused"), v.literal("failed")),
    startAt: v.number(),
    endAt: v.optional(v.number()),
    cronExpr: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("calendarItems", { ...args, createdAt: now, updatedAt: now });
  }
});

export const updateStatus = mutation({
  args: {
    id: v.id("calendarItems"),
    status: v.union(v.literal("planned"), v.literal("running"), v.literal("done"), v.literal("paused"), v.literal("failed"))
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
  }
});
