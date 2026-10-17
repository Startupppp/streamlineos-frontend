import { z } from "zod";
import type { CreateManagedProductInput, UpdateManagedProductInput } from "@/types/projects";

const LIFECYCLE_VALUES = ["discovery", "build", "growth", "mature", "sunset"] as const;
const HEALTH_VALUES = ["on_track", "at_risk", "off_track", "unknown"] as const;

const SUCCESS_METRIC_SCHEMA = z.object({
  label: z.string().trim().min(1).max(100),
  target: z.string().max(100).optional(),
});

const SEGMENTS_OR_TAGS_SCHEMA = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((values) => [...new Set(values)]);

export const createManagedProductSchema = z.object({
  name: z.string().trim().min(1, "Required").max(255),
  key: z
    .string()
    .min(1, "Required")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Uppercase letters, digits, hyphens, or underscores only"),
  description: z.string().max(2000),
  ownerId: z.string(),
  lifecycle: z.enum(LIFECYCLE_VALUES).optional(),
  health: z.enum(HEALTH_VALUES).optional(),
  teamId: z.number().int().positive().optional(),
  segments: SEGMENTS_OR_TAGS_SCHEMA,
  tags: SEGMENTS_OR_TAGS_SCHEMA,
  northStarMetric: z.string().max(500).optional(),
  successMetrics: z.array(SUCCESS_METRIC_SCHEMA).max(10),
  vision: z.string().max(2000).optional(),
  missionStatement: z.string().max(2000).optional(),
  targetCustomer: z.string().max(2000).optional(),
  differentiators: z.string().max(2000).optional(),
});

export type CreateManagedProductFormValues = z.infer<typeof createManagedProductSchema>;

export function toCreateManagedProductInput(
  values: CreateManagedProductFormValues,
): CreateManagedProductInput {
  return {
    name: values.name,
    key: values.key,
    ...(values.description ? { description: values.description } : {}),
    ...(values.ownerId ? { ownerId: values.ownerId } : {}),
    ...(values.lifecycle ? { lifecycle: values.lifecycle } : {}),
    ...(values.health ? { health: values.health } : {}),
    ...(values.teamId ? { teamId: values.teamId } : {}),
    ...(values.segments.length ? { segments: values.segments } : {}),
    ...(values.tags.length ? { tags: values.tags } : {}),
    ...(values.northStarMetric ? { northStarMetric: values.northStarMetric } : {}),
    ...(values.successMetrics.length ? { successMetrics: values.successMetrics } : {}),
    ...(values.vision ? { vision: values.vision } : {}),
    ...(values.missionStatement ? { missionStatement: values.missionStatement } : {}),
    ...(values.targetCustomer ? { targetCustomer: values.targetCustomer } : {}),
    ...(values.differentiators ? { differentiators: values.differentiators } : {}),
  };
}

export const editManagedProductSchema = z.object({
  name: z.string().trim().min(1, "Required").max(255),
  description: z.string().max(2000),
  ownerId: z.string(),
  status: z.enum(["active", "archived"]),
  lifecycle: z.enum(LIFECYCLE_VALUES).optional(),
  health: z.enum(HEALTH_VALUES).optional(),
  teamId: z.number().int().positive().nullable().optional(),
  segments: SEGMENTS_OR_TAGS_SCHEMA,
  tags: SEGMENTS_OR_TAGS_SCHEMA,
  northStarMetric: z.string().max(500).optional(),
  successMetrics: z.array(SUCCESS_METRIC_SCHEMA).max(10),
  vision: z.string().max(2000).optional(),
  missionStatement: z.string().max(2000).optional(),
  targetCustomer: z.string().max(2000).optional(),
  differentiators: z.string().max(2000).optional(),
  roadmapDefaultHorizon: z.enum(["now", "next", "later"]).nullable().optional(),
});

export type EditManagedProductFormValues = z.infer<typeof editManagedProductSchema>;

export function toEditManagedProductInput(
  values: EditManagedProductFormValues,
  version: number,
): UpdateManagedProductInput {
  return {
    version,
    name: values.name,
    description: values.description || null,
    ownerId: values.ownerId || null,
    status: values.status,
    lifecycle: values.lifecycle,
    health: values.health,
    teamId: values.teamId ?? null,
    segments: values.segments,
    tags: values.tags,
    northStarMetric: values.northStarMetric || null,
    successMetrics: values.successMetrics,
    vision: values.vision || null,
    missionStatement: values.missionStatement || null,
    targetCustomer: values.targetCustomer || null,
    differentiators: values.differentiators || null,
    roadmapDefaultHorizon: values.roadmapDefaultHorizon ?? null,
  };
}

export const LIFECYCLE_OPTIONS = [
  { value: "discovery", label: "Discovery" },
  { value: "build", label: "Build" },
  { value: "growth", label: "Growth" },
  { value: "mature", label: "Mature" },
  { value: "sunset", label: "Sunset" },
] as const;

export const HEALTH_OPTIONS = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
  { value: "unknown", label: "Unknown" },
] as const;

export const ROADMAP_HORIZON_OPTIONS = [
  { value: "now", label: "Now" },
  { value: "next", label: "Next" },
  { value: "later", label: "Later" },
] as const;
