import { db } from "./db";
import { auditLogs } from "./db/schema";
import { logger } from "./logger";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.signup"
  | "user.password_reset"
  | "user.deactivated"
  | "org.created"
  | "org.member_invited"
  | "org.member_removed"
  | "org.member_role_changed"
  | "hr.employee_added"
  | "hr.salary_changed"
  | "hr.leave_approved"
  | "hr.leave_rejected"
  | "hr.payroll_generated"
  | "hr.document_uploaded"
  | "project.created"
  | "project.deleted"
  | "expense.approved"
  | "expense.rejected"
  | "settings.updated"
  | "file.upload"
  | "file.download"
  | "target.created"
  | "target.updated"
  | "target.deleted"
  | "security_settings.updated"
  | "mfa.reset"
  | "deal.created"
  | "deal.updated"
  | "deal.deleted"
  | "lead.created"
  | "lead.updated"
  | "lead.deleted"
  | "lead.assigned"
  | "LEAD_MERGED"
  | "document.generated"
  | "CANDIDATE_STAGE_CHANGED"
  | "DOWNLOAD"
  | "VIEW"
  | "hr.leave_cancelled"
  | "project.created_from_deal"
  | "role.changed"
  | "submit_lead"
  | "document.signed"
  | "document.viewed"
  | "document.declined";

interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  orgId?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action: entry.action,
      userId: entry.userId,
      orgId: entry.orgId ?? null,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (error) {

    logger.error("AUDIT_FAILURE: Failed to create audit log — investigate immediately", {
      action: entry.action,
      userId: entry.userId,
      targetId: entry.targetId,
      error,
    });
  }
}
