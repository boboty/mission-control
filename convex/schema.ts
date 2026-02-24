import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("blocked"), v.literal("done")),
    assignee: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"]),

  calendarItems: defineTable({
    title: v.string(),
    notes: v.optional(v.string()),
    owner: v.union(v.literal("user"), v.literal("assistant")),
    itemType: v.union(v.literal("scheduled"), v.literal("cron")),
    status: v.union(v.literal("planned"), v.literal("running"), v.literal("done"), v.literal("paused"), v.literal("failed")),
    startAt: v.number(),
    endAt: v.optional(v.number()),
    cronExpr: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_startAt", ["startAt"])
    .index("by_owner", ["owner"])
    .index("by_status", ["status"]),

  teamMembers: defineTable({
    name: v.string(),
    role: v.string(),
    type: v.union(v.literal("human"), v.literal("agent")),
    status: v.union(v.literal("online"), v.literal("busy"), v.literal("offline")),
    updatedAt: v.number()
  }).index("by_type", ["type"])
});
