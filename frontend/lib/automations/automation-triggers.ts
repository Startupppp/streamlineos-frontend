/**
 * The automation trigger vocabulary, mirrored from the backend engine.
 *
 * SOURCE OF TRUTH: `streamlineos-backend/src/db/schema/automation/rules.ts`
 * (AUTOMATION_TRIGGERS) and `src/modules/automation/automation-trigger-modules.ts`
 * (AUTOMATION_TRIGGER_MODULE). Both halves are asserted against this file by
 * `lib/automations/__tests__/automation-trigger-mirror.test.ts`, which reads the
 * backend repo, so drift is a red test rather than a screen that silently drops
 * triggers.
 *
 * Do not add a trigger here that the engine does not dispatch: it would be dead
 * forever. Do not leave one out: it would be unreachable in the UI.
 */

export const AUTOMATION_TRIGGERS = [
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
  "ticket.priority_changed",
  "ticket.message_received",
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
  "sign.envelope.sent",
  "sign.envelope.completed",
  "sign.envelope.declined",
  "sign.envelope.voided",
  "sign.envelope.expired",
  "sign.recipient.completed",
  "sign.bulk_send.completed",
] as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const TRIGGER_MODULES = ["crm", "support", "finance", "hr", "sign"] as const;

export type TriggerModule = (typeof TRIGGER_MODULES)[number];

export const AUTOMATION_TRIGGER_MODULE: Record<AutomationTrigger, TriggerModule> = {
  "lead.created": "crm",
  "lead.status_changed": "crm",
  "lead.assigned": "crm",
  "lead.score_updated": "crm",
  "deal.created": "crm",
  "deal.stage_changed": "crm",
  "deal.won": "crm",
  "deal.lost": "crm",
  "ticket.created": "support",
  "ticket.assigned": "support",
  "ticket.status_changed": "support",
  "ticket.priority_changed": "support",
  "ticket.message_received": "support",
  "ticket.escalated": "support",
  "sla.breached": "support",
  "invoice.overdue": "finance",
  "invoice.paid": "finance",
  "candidate.application_created": "hr",
  "candidate.stage_changed": "hr",
  "candidate.bgv_status_changed": "hr",
  "interview.scheduled": "hr",
  "interview.completed": "hr",
  "scorecard.submitted": "hr",
  "offer.sent": "hr",
  "offer.accepted": "hr",
  "offer.rejected": "hr",
  "onboarding.started": "hr",
  "onboarding.task_overdue": "hr",
  "onboarding.document_submitted": "hr",
  "onboarding.completed": "hr",
  "leave.requested": "hr",
  "leave.approved": "hr",
  "leave.rejected": "hr",
  "attendance.anomaly": "hr",
  "attendance.late": "hr",
  "resignation.submitted": "hr",
  "resignation.approved": "hr",
  "employee.onboarded": "hr",
  "employee.terminated": "hr",
  "employee.resignation": "hr",
  "certification.expiring": "hr",
  "document.review_requested": "hr",
  "performance.review_cycle_started": "hr",
  "review.cycle_started": "hr",
  "expense.submitted": "hr",
  "expense.approved": "hr",
  "reimbursement.approved": "hr",
  "reimbursement.rejected": "hr",
  "sign.envelope.sent": "sign",
  "sign.envelope.completed": "sign",
  "sign.envelope.declined": "sign",
  "sign.envelope.voided": "sign",
  "sign.envelope.expired": "sign",
  "sign.recipient.completed": "sign",
  "sign.bulk_send.completed": "sign",
};

export function automationTriggersForModule(
  owner: TriggerModule,
): readonly AutomationTrigger[] {
  return AUTOMATION_TRIGGERS.filter((trigger) => AUTOMATION_TRIGGER_MODULE[trigger] === owner);
}
