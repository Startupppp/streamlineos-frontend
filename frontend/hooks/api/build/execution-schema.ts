import { z } from "zod";

const cycleListItemSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(["draft", "active", "completed"]),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  totalItems: z.number(),
  completedItems: z.number(),
  progress: z.number(),
});

const cycleRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "active", "completed"]),
  startDate: z.string(),
  endDate: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const moduleListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  orgId: z.string(),
  status: z.enum([
    "backlog",
    "planned",
    "in-progress",
    "completed",
    "paused",
    "cancelled",
  ]),
  leadId: z.string().nullable(),
  endDate: z.string().nullable(),
  startDate: z.string().nullable(),
  createdBy: z.string(),
  projectId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  description: z.string().nullable(),
  totalItems: z.number(),
  completedItems: z.number(),
  progress: z.number(),
});

const moduleRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum([
    "backlog",
    "planned",
    "in-progress",
    "completed",
    "paused",
    "cancelled",
  ]),
  leadId: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const epicRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  type: z.string(),
  status: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable(),
  projectId: z.number().nullable(),
  ticketNumber: z.number(),
  epicId: z.number().nullable(),
  reporterId: z.string().nullable(),
  points: z.number().nullable(),
  storyPoints: z.number().nullable(),
  link: z.string().nullable(),
  rank: z.string().nullable(),
  parentTicketId: z.number().nullable(),
  originalEstimate: z.string().nullable(),
  timeSpent: z.string().nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  moduleId: z.number().nullable(),
  cycleId: z.number().nullable(),
  sequenceId: z.string().nullable(),
  estimate: z.number().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const cycleListContract = z.array(cycleListItemSchema);
export const cycleRowContract = cycleRowSchema;
export const moduleListContract = z.array(moduleListItemSchema);
export const moduleRowContract = moduleRowSchema;
export const epicListContract = z.array(epicRowSchema);

export const memberCapacityItemSchema = z.object({
  userId: z.string(),
  membershipId: z.number().int(),
  workingDaysInWindow: z.number(),
  leaveDays: z.number(),
  halfLeaveDays: z.number(),
  netCapacityDays: z.number(),
  capacityHours: z.number().nullable(),
  loggedHours: z.number(),
  isOverAllocated: z.boolean(),
  isZeroCapacity: z.boolean(),
  utilizationPercent: z.number().nullable(),
});

export const workloadCapacityContract = z.object({
  members: z.array(memberCapacityItemSchema),
});

export type MemberCapacityItem = z.infer<typeof memberCapacityItemSchema>;
