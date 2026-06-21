import { getEmailTemplate, escapeHtml } from "../base";

export function getPayslipEmailTemplate(params: {
  employeeName: string;
  month: string;
  netSalary: string;
  orgName: string;
}): { subject: string; html: string } {
  const sName = escapeHtml(params.employeeName);
  const sMonth = escapeHtml(params.month);
  const sNet = escapeHtml(params.netSalary);
  const sOrg = escapeHtml(params.orgName);

  const content = `
    <p class="email-text">Dear <strong>${sName}</strong>,</p>
    <p class="email-text">
      Your payslip for <strong>${sMonth}</strong> has been processed and is attached to this email
      as a PDF. You can also view it anytime from the <strong>My Payslips</strong> section of your
      account.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;color:#166534;font-size:13px;">Net Salary — ${sMonth}</p>
      <p style="margin:6px 0 0 0;color:#166534;font-size:26px;font-weight:700;">₹${sNet}</p>
    </div>
    <p class="email-text">
      The PDF attachment contains your full salary breakdown including earnings, deductions, and bank
      transfer details. If you have any questions, please contact the HR department.
    </p>
    <p class="email-text">Best regards,<br/><strong>${sOrg} — HR Team</strong></p>
  `;

  const subject = `Your Payslip for ${sMonth} is Ready — ${sOrg}`;

  return {
    subject,
    html: getEmailTemplate({ title: "Your Payslip is Ready", preheader: `Net salary: ₹${sNet}`, content }),
  };
}
