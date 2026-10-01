import { z } from "zod";
import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { genCycleListSchema, genModuleListSchema, genWorkloadCapacitySchema } from "@/contracts/build-contracts.generated";


const cycleRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  goal: z.string().nullable(),
  capacity: z.number().nullable(),
  status: z.enum(DB_ENUMS.cycle_status),
  version: z.number(),
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
  status: z.enum(DB_ENUMS.module_status),
  leadId: z.string().nullable(),
  endDate: z.string().nullable(),
  startDate: z.string().nullable(),
  version: z.number(),
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
  status: z.enum(DB_ENUMS.module_status),
  leadId: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  version: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const epicAssigneeUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});

const epicRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  type: z.enum(DB_ENUMS.ticket_type),
  status: z.string(),
  priority: z.enum(DB_ENUMS.ticket_priority).nullable(),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
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
  version: z.number().int(),
  dependencyCount: z.number(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  assignee: z
    .object({ user: epicAssigneeUserSchema.nullable() })
    .nullable()
    .optional()
    .transform((value) => value?.user ?? null),
});

export const cyclePageContract = genCycleListSchema;
export const cycleListContract = cyclePageContract;
export const cycleRowContract = cycleRowSchema;
export const moduleListContract = z.array(moduleListItemSchema);
export const modulePageContract = genModuleListSchema;
export const moduleResponseContract = z.union([modulePageContract, moduleListContract]);
export const moduleRowContract = moduleRowSchema;
export const epicPageContract = z.object({
  data: z.array(epicRowSchema),
  pagination: z.object({
    limit: z.number().int().positive(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const memberCapacityItemSchema = z.object({
  userId: z.string(),
  membershipId: z.number().int(),
  teams: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
  workingDaysInWindow: z.number(),
  leaveDays: z.number(),
  halfLeaveDays: z.number(),
  netCapacityDays: z.number(),
  capacityHours: z.number().nullable(),
  loggedHours: z.number(),
  estimateHours: z.number().nullable(),
  allocationPercent: z.number().nullable(),
  varianceHours: z.number().nullable(),
  isOverAllocated: z.boolean(),
  isZeroCapacity: z.boolean(),
  utilizationPercent: z.number().nullable(),
});

export const workloadCapacityContract = genWorkloadCapacitySchema;

export type MemberCapacityItem = z.infer<typeof memberCapacityItemSchema>;
