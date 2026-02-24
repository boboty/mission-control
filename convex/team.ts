import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("teamMembers").collect();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    type: v.union(v.literal("human"), v.literal("agent")),
    status: v.union(v.literal("online"), v.literal("busy"), v.literal("offline"))
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teamMembers", { ...args, updatedAt: Date.now() });
  }
});

export const updateStatus = mutation({
  args: {
    id: v.id("teamMembers"),
    status: v.union(v.literal("online"), v.literal("busy"), v.literal("offline"))
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
  }
});
