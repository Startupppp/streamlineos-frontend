import { z } from 'zod';

const sprintTicketSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  points: z.number().nullable(),
  sprintId: z.number().nullable(),
});

const sprintListItemSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  goal: z.string().nullable(),
  status: z.string(),
  tickets: z.array(sprintTicketSchema),
});

const sprintRowSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  goal: z.string().nullable(),
  status: z.string(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const cycleListItemSchema = z.object({
  id: z.number(),
  orgId: z.string(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
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
  status: z.string(),
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
  status: z.string(),
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
  status: z.string(),
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
  description: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  priority: z.string(),
  projectId: z.number().nullable(),
  ticketNumber: z.number(),
  sprintId: z.number().nullable(),
  epicId: z.number().nullable(),
  assigneeMembershipId: z.number().nullable(),
  points: z.number().nullable(),
  storyPoints: z.number().nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  estimate: z.number().nullable(),
  completionPercentage: z.number(),
  rank: z.string(),
  timeSpent: z.string(),
  version: z.number(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sprintListContract = z.array(sprintListItemSchema);
export const sprintRowContract = sprintRowSchema;
export const cycleListContract = z.array(cycleListItemSchema);
export const cycleRowContract = cycleRowSchema;
export const moduleListContract = z.array(moduleListItemSchema);
export const moduleRowContract = moduleRowSchema;
export const epicListContract = z.array(epicRowSchema);
