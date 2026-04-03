import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "vaivamm-crm",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type InngestEvents = {
  "crm/lead.created": {
    data: {
      leadId: number;
      orgId: string;
      assignedTo: string | null;
    };
  };
  "crm/lead.sla.breached": {
    data: {
      leadId: number;
      orgId: string;
      assignedTo: string | null;
      managerId: string | null;
      hoursOverdue: number;
    };
  };
  "crm/deal.stage.changed": {
    data: {
      dealId: number;
      orgId: string;
      previousStage: string;
      newStage: string;
      userId: string;
    };
  };
  "hr/leave.requested": {
    data: {
      requestId: number;
      userId: string;
      orgId: string;
      approverId: string | null;
    };
  };
  "hr/leave.approved": {
    data: {
      requestId: number;
      userId: string;
      orgId: string;
    };
  };
  "hr/expense.submitted": {
    data: {
      expenseId: number;
      userId: string;
      orgId: string;
      amount: number;
    };
  };
  "hr/payroll.generated": {
    data: {
      payrollId: number;
      userId: string;
      orgId: string;
      month: string;
    };
  };
  "notification/send": {
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      link?: string;
      channels?: ("in_app" | "email" | "push" | "sms")[];
    };
  };
  "email/send": {
    data: {
      to: string;
      subject: string;
      templateId: string;
      context: Record<string, string>;
    };
  };
  "email/bulk-send": {
    data: {
      recipients: string[];
      subject: string;
      templateId: string;
      context: Record<string, string>;
    };
  };
  "report/generate": {
    data: {
      reportType: string;
      orgId: string;
      userId: string;
      params: Record<string, unknown>;
    };
  };
};
