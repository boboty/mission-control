import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const create = mutation({
  args: { title: v.string(), assignee: v.union(v.literal("user"), v.literal("assistant")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      title: args.title,
      assignee: args.assignee,
      status: "todo",
      createdAt: now,
      updatedAt: now
    });
  }
});

export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("blocked"), v.literal("done"))
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
  }
});

export const updateAssignee = mutation({
  args: { id: v.id("tasks"), assignee: v.union(v.literal("user"), v.literal("assistant")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { assignee: args.assignee, updatedAt: Date.now() });
  }
});
