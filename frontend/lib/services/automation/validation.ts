import { z } from "zod";

export const automationTriggerSchema = z.enum([
  "lead.created",
  "lead.status_changed",
  "lead.assigned",
  "lead.score_updated",
  "deal.created",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "ticket.created",
  "ticket.assigned",
  "ticket.status_changed",
  "ticket.escalated",
  "invoice.overdue",
  "invoice.paid",
  "candidate.application_created",
  "candidate.stage_changed",
  "candidate.bgv_status_changed",
  "interview.scheduled",
  "interview.completed",
  "scorecard.submitted",
  "offer.sent",
  "offer.accepted",
  "offer.rejected",
  "sla.breached",
  "onboarding.started",
  "onboarding.task_overdue",
  "onboarding.document_submitted",
  "onboarding.completed",
  "leave.requested",
  "leave.approved",
  "leave.rejected",
  "attendance.anomaly",
  "attendance.late",
  "resignation.submitted",
  "resignation.approved",
  "employee.onboarded",
  "employee.terminated",
  "employee.resignation",
  "certification.expiring",
  "document.review_requested",
  "performance.review_cycle_started",
  "review.cycle_started",
  "expense.submitted",
  "expense.approved",
  "reimbursement.approved",
  "reimbursement.rejected",
]);

export const automationConditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "neq", "contains", "gt", "lt", "exists"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("notify_roles"),
    config: z.object({
      roles: z.array(z.string().min(1)).min(1),
      title: z.string().min(1),
      message: z.string().min(1),
      link: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("notify_all"),
    config: z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      link: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("email"),
    config: z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("create_task"),
    config: z.object({
      title: z.string().min(1),
      assigneeId: z.string().optional(),
      dueInDays: z.number().int().min(0).optional(),
    }),
  }),
  z.object({
    type: z.literal("webhook"),
    config: z.object({
      event: z.string().min(1),
    }),
  }),
]);

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  triggerEvent: automationTriggerSchema,
  conditions: z.array(automationConditionSchema).default([]),
  actions: z.array(automationActionSchema).min(1),
  isEnabled: z.boolean().default(true),
});

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  triggerEvent: automationTriggerSchema.optional(),
  conditions: z.array(automationConditionSchema).optional(),
  actions: z.array(automationActionSchema).min(1).optional(),
  isEnabled: z.boolean().optional(),
});

export const testAutomationSchema = z.object({
  payload: z.record(z.string(), z.unknown()).default({}),
});
