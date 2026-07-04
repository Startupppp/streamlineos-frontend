# Payroll Payout Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Payroll Payout backend under `backend/src/modules/payroll/payout/` — approvals, locking, bank payout batches, payslip templates, and publishing/PDF.

**Architecture:** NestJS controllers + services under the existing `PayrollPayoutModule`. All global providers (`DrizzleModule`, `AccessModule`, `AuditModule`, `StorageModule`, `EmailModule`) are `@Global()` so `payroll-payout.module.ts` needs no imports array — only its own controllers + providers. Canonical tables: `payrollRunEvents` + `payslipPublications` (never `payrollLockEvents`/`payslipPublishEvents`).

**Tech Stack:** NestJS, Drizzle ORM, Zod, pdf-lib (for PDF), R2/StorageService, AuditService, EmailService, AccessService.

---

## File Map

| File | Responsibility |
|------|----------------|
| `payout/dto/payout.schemas.ts` | All Zod input schemas for payout endpoints |
| `payout/lib/amount-in-words.ts` | `amountInWords(decimal: string, currency: string): string` (INR: lakh/crore; others: international) |
| `payout/lib/payslip-renderer.ts` | `renderPayslipHtml(params: RenderParams): string` — 3 layouts (CLASSIC/MODERN/COMPLIANCE); `buildPayslipPdfData(params): PayslipPdfData` — maps snapshot to pdf-lib input |
| `payout/approvals.service.ts` | submitApproval, listApprovals, approveStage, rejectStage (maker-checker; policy-driven chain; auto-approve path) |
| `payout/approvals.controller.ts` | POST /payroll/runs/:runId/submit-approval, GET /payroll/runs/:runId/approvals, POST /payroll/runs/:runId/approvals/:approvalId/approve\|reject |
| `payout/locking.service.ts` | lock, reopen, close; canTransitionRun guard; immutable snapshot check |
| `payout/locking.controller.ts` | POST /payroll/runs/:runId/lock\|reopen\|close |
| `payout/payout-batches.service.ts` | validatePayout, createBatch (CSV→R2, idempotency), markSent, markItemPaid/Failed, markBatchPaid, listBatches, getBatch, getBankDetails (unmasked+audit) |
| `payout/payout-batches.controller.ts` | GET validation, POST batch, GET batches list/detail, POST mark-sent/mark-paid/items/:id/mark-paid/mark-failed, GET employees/:userId/bank |
| `payout/payslip-templates.service.ts` | list (lazy-seed 3 defaults), create, update, delete (409 on default), preview (fake-data render) |
| `payout/payslip-templates.controller.ts` | CRUD + preview under /payroll/payslip-templates |
| `payout/publishing.service.ts` | publish (upsert publications, hash, PDF→R2, email), listPublications, downloadPdf (hash verify → re-render from snapshot) |
| `payout/publishing.controller.ts` | POST /payroll/runs/:runId/payslips/publish, GET list, GET /:publicationId/download (ESS-aware) |
| `payout/payroll-payout.module.ts` | Wire all 5 controllers + 5 services |

---

## Shared Contract (read-only imports)

```typescript
// FROM: backend/src/modules/payroll/payroll.types.ts
import {
  canTransitionRun,
  PAYROLL_LOCKED_STATUSES,
  type CalculationSnapshot,
  type CalculationSnapshotLine,
  type PayrollApprovalStageDef,
  type PayrollPolicyConfig,
  type PayslipLayout,
  type PayrollWorkerType,
  type PayrollToggles,
  DEFAULT_PAYROLL_TOGGLES,
} from "../payroll.types";
```

---

## Key Decisions / Invariants

1. **No CLOSED event enum** — `payrollRunEventTypeEnum` has no "CLOSED" value. `close()` sets `closedAt` but writes NO `payrollRunEvents` row. **Gap to report.**
2. **`payrollLockEvents` is dead** — all lifecycle audit goes to `payrollRunEvents`.
3. **`payslipPublishEvents` is dead** — canonical table is `payslipPublications`.
4. **Bank details source** — `users.bankDetails` text column, encrypted JSON, decrypted by `decryptBankDetails()` from `hr-payroll/lib/encryption.ts`.
5. **Idempotency** — manual: read `Idempotency-Key` header → check `payrollBankBatches.idempotencyKey` unique index → return existing batch on replay.
6. **Audit log** — `AuditService` (global) via `audit.log({ action: "payroll.bank_details_viewed", ... })`. Service is already available — no gap.
7. **Maker-checker** — query `payrollRunEvents` for the `APPROVAL_SUBMITTED` event of the run and compare `actorId` with the current approver's `userId`.
8. **Storage** — `StorageService.uploadFile(buffer, "payroll/bank-batches", fileName, "text/csv")` returns `{ url, key }`. Store `url` in `payrollBankBatches` (no dedicated `bankFileUrl` column — store in `format` or add batchFileUrl? → batch has no fileUrl column. Put the key in `metadata` on the event or just return it from the API without persisting. Actually, re-check schema — `payrollBankBatches` has no `bankFileUrl` column. Decision: upload to R2 and return the signed URL in the creation response only — do NOT persist it since the batch has no column for it. Log it on the BANK_BATCH_GENERATED event metadata.)
9. **PDF rendering** — Import `generatePayslipPdf` from `../../../hr-payroll/lib/payslip-pdf` and map `CalculationSnapshot` → `PayslipPdfData`. Function is pure and async, returns `Buffer`.
10. **Template seeding** — lazy: on first `list()` for an org with 0 templates, insert 3 default rows inside a transaction, return them.

---

## Layout Config Shapes

```typescript
// PayslipTemplateConfig (all layouts share this shape)
interface PayslipTemplateConfig {
  accent: string;                    // hex e.g. "#0f2b7f"
  showEmployerContributions: boolean;
  showYtd: boolean;
}

// CLASSIC  — accent: "#0f2b7f", showEmployerContributions: false, showYtd: false
// MODERN   — accent: "#3b82f6", showEmployerContributions: false, showYtd: false
// COMPLIANCE — accent: "#1e293b", showEmployerContributions: true, showYtd: false
```

---

## Endpoint Table

| Method | Path | Permission | Request | Response |
|--------|------|-----------|---------|---------|
| POST | /payroll/runs/:runId/submit-approval | payroll:runs:update | — | `{ approvalId?, status, autoApproved }` |
| GET | /payroll/runs/:runId/approvals | payroll:runs:view | — | `ApprovalRow[]` |
| POST | /payroll/runs/:runId/approvals/:approvalId/approve | payroll:runs:approve | `{ comment? }` | `{ success, runStatus? }` |
| POST | /payroll/runs/:runId/approvals/:approvalId/reject | payroll:runs:approve | `{ comment }` | `{ success }` |
| POST | /payroll/runs/:runId/lock | payroll:runs:manage | — | `{ success, lockedAt }` |
| POST | /payroll/runs/:runId/reopen | payroll:runs:manage | `{ reason }` | `{ success, reopenedAt }` |
| POST | /payroll/runs/:runId/close | payroll:runs:manage | — | `{ success, closedAt }` |
| GET | /payroll/runs/:runId/payout/validation | payroll:bank:manage | — | `ValidationItem[]` |
| POST | /payroll/runs/:runId/payout/batches | payroll:bank:manage | `{ format? }` + `Idempotency-Key` header | `BatchResponse` |
| GET | /payroll/payout/batches | payroll:bank:manage | `?runId` | `BatchRow[]` |
| GET | /payroll/payout/batches/:batchId | payroll:bank:manage | — | `BatchDetailRow` |
| POST | /payroll/payout/batches/:batchId/mark-sent | payroll:bank:manage | — | `{ success }` |
| POST | /payroll/payout/batches/:batchId/mark-paid | payroll:bank:manage | `{ transactionRef }` | `{ success }` |
| POST | /payroll/payout/batches/:batchId/items/:itemId/mark-paid | payroll:bank:manage | `{ transactionRef }` | `{ success }` |
| POST | /payroll/payout/batches/:batchId/items/:itemId/mark-failed | payroll:bank:manage | `{ failureReason }` | `{ success }` |
| GET | /payroll/employees/:employeeUserId/bank | payroll:bank:view | — | `BankDetailsResponse` |
| GET | /payroll/payslip-templates | payroll:payslips:view | — | `TemplateRow[]` |
| POST | /payroll/payslip-templates | payroll:payslips:manage | `{ name, layout, config, isDefault? }` | `TemplateRow` |
| PATCH | /payroll/payslip-templates/:templateId | payroll:payslips:manage | partial of create | `TemplateRow` |
| DELETE | /payroll/payslip-templates/:templateId | payroll:payslips:manage | — | `{ success }` |
| POST | /payroll/payslip-templates/preview | payroll:payslips:manage | `{ layout, config }` | `{ html }` |
| POST | /payroll/runs/:runId/payslips/publish | payroll:payslips:manage | `{ userIds? }` | `{ published, total, runStatus }` |
| GET | /payroll/runs/:runId/payslips | payroll:payslips:view | — | `PublicationRow[]` |
| GET | /payroll/payslips/:publicationId/download | payroll:payslips:view OR own userId | — | PDF buffer (application/pdf) |

---

## Task 1: DTOs + amount-in-words

**Files:**
- Create: `backend/src/modules/payroll/payout/dto/payout.schemas.ts`
- Create: `backend/src/modules/payroll/payout/lib/amount-in-words.ts`

- [ ] **Create `payout/dto/payout.schemas.ts`**

```typescript
import { z } from "zod";

export const payslipConfigSchema = z.object({
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#0f2b7f"),
  showEmployerContributions: z.boolean().optional().default(false),
  showYtd: z.boolean().optional().default(false),
});
export type PayslipTemplateConfig = z.infer<typeof payslipConfigSchema>;

export const approvalActionSchema = z.object({
  comment: z.string().max(1000).optional(),
});
export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;

export const rejectActionSchema = z.object({
  comment: z.string().min(1, "Comment is required on rejection").max(1000),
});
export type RejectActionInput = z.infer<typeof rejectActionSchema>;

export const reopenRunSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});
export type ReopenRunInput = z.infer<typeof reopenRunSchema>;

export const createBatchSchema = z.object({
  format: z.enum(["NEFT_CSV", "RTGS_CSV"]).optional().default("NEFT_CSV"),
});
export type CreateBatchInput = z.infer<typeof createBatchSchema>;

export const batchesQuerySchema = z.object({
  runId: z.coerce.number().int().positive().optional(),
});
export type BatchesQueryInput = z.infer<typeof batchesQuerySchema>;

export const markItemPaidSchema = z.object({
  transactionRef: z.string().min(1).max(100),
});
export type MarkItemPaidInput = z.infer<typeof markItemPaidSchema>;

export const markItemFailedSchema = z.object({
  failureReason: z.string().min(1).max(500),
});
export type MarkItemFailedInput = z.infer<typeof markItemFailedSchema>;

export const markBatchPaidSchema = z.object({
  transactionRef: z.string().min(1).max(100),
});
export type MarkBatchPaidInput = z.infer<typeof markBatchPaidSchema>;

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  layout: z.enum(["CLASSIC", "MODERN", "COMPLIANCE"]),
  config: payslipConfigSchema,
  isDefault: z.boolean().optional().default(false),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const patchTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  layout: z.enum(["CLASSIC", "MODERN", "COMPLIANCE"]).optional(),
  config: payslipConfigSchema.partial().optional(),
  isDefault: z.boolean().optional(),
});
export type PatchTemplateInput = z.infer<typeof patchTemplateSchema>;

export const previewTemplateSchema = z.object({
  layout: z.enum(["CLASSIC", "MODERN", "COMPLIANCE"]),
  config: payslipConfigSchema,
});
export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;

export const publishSchema = z.object({
  userIds: z.array(z.string()).optional(),
});
export type PublishInput = z.infer<typeof publishSchema>;
```

- [ ] **Create `payout/lib/amount-in-words.ts`**

```typescript
const A = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const B = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function helper(n: number): string {
  if (n < 20) return A[n] ?? "";
  if (n < 100) return (B[Math.floor(n / 10)] ?? "") + (n % 10 ? " " + (A[n % 10] ?? "") : "");
  if (n < 1000) return (A[Math.floor(n / 100)] ?? "") + " Hundred" + (n % 100 ? " " + helper(n % 100) : "");
  if (n < 100000) return helper(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + helper(n % 1000) : "");
  if (n < 10000000) return helper(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + helper(n % 100000) : "");
  return helper(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + helper(n % 10000000) : "");
}

export function amountInWords(decimalString: string, currency: string): string {
  const n = Math.floor(parseFloat(decimalString) || 0);
  if (n === 0) return currency === "INR" ? "Zero Rupees Only" : "Zero Only";
  const words = helper(n);
  return currency === "INR" ? `${words} Rupees Only` : `${words} Only`;
}
```

- [ ] **Verify tsc on these 2 files**: `pnpm -C backend exec tsc --noEmit`

---

## Task 2: Payslip HTML Renderer

**Files:**
- Create: `backend/src/modules/payroll/payout/lib/payslip-renderer.ts`

- [ ] **Create `payout/lib/payslip-renderer.ts`**

```typescript
import type { CalculationSnapshot, PayslipLayout, PayrollWorkerType } from "../../payroll.types";
import type { PayslipTemplateConfig } from "../dto/payout.schemas";
import type { PayslipPdfData } from "../../../hr-payroll/lib/payslip-pdf";
import { amountInWords } from "./amount-in-words";

const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmtMonthYear(month: string): string {
  const [yr, mo] = month.split("-");
  return `${MONTHS_LONG[(parseInt(mo ?? "1") - 1)] ?? month} ${yr ?? ""}`.trim();
}

function fmtMoney(v: string, currency: string): string {
  const n = parseFloat(v) || 0;
  return currency === "INR"
    ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export interface RendererEmployeeInfo {
  name: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  maskedAccount?: string;
  bankName?: string;
  ifsc?: string;
  pan?: string;
}

export interface RendererOrgInfo {
  name: string;
  address?: string;
  logoSvg?: string;
}

export interface RenderParams {
  snapshot: CalculationSnapshot;
  employee: RendererEmployeeInfo;
  org: RendererOrgInfo;
  workerType: PayrollWorkerType;
  month: string;
  layout: PayslipLayout;
  config: PayslipTemplateConfig;
}

export function renderPayslipHtml(params: RenderParams): string {
  const { snapshot, employee, org, workerType, month, layout, config } = params;
  const isContractor = workerType === "CONTRACTOR";
  const title = isContractor ? "Payment Advice" : "Salary Slip";
  const currency = snapshot.currency;
  const monthLabel = fmtMonthYear(month);
  const accent = config.accent;

  const earnings = snapshot.lines.filter(l => l.category === "EARNING");
  const deductions = snapshot.lines.filter(l => l.category === "DEDUCTION" || l.category === "TAX");
  const employer = snapshot.lines.filter(l => l.category === "EMPLOYER_CONTRIBUTION");
  const reimbursements = snapshot.lines.filter(l => l.category === "REIMBURSEMENT");

  const words = amountInWords(snapshot.totals.net, currency);

  const empBar = `
    <div style="background:${accent};color:#fff;padding:8px 20px;display:flex;gap:32px;flex-wrap:wrap;">
      ${[["Employee",employee.name],["ID",employee.employeeId??"—"],["Designation",employee.designation??"—"],["Department",employee.department??"—"]].map(([label,val])=>`<div><div style="font-size:9px;opacity:0.7;text-transform:uppercase;">${label}</div><div style="font-size:13px;font-weight:600;">${val}</div></div>`).join("")}
    </div>`;

  const earningsRows = earnings.map(l => `<tr><td>${l.name}</td><td style="text-align:right;">${fmtMoney(l.amount, currency)}</td></tr>`).join("");
  const deductionRows = deductions.map(l => `<tr><td>${l.name}</td><td style="text-align:right;color:#b91c1c;">${fmtMoney(l.amount, currency)}</td></tr>`).join("");
  const employerRows = config.showEmployerContributions && !isContractor
    ? employer.map(l => `<tr><td>${l.name}</td><td style="text-align:right;">${fmtMoney(l.amount, currency)}</td></tr>`).join("")
    : "";

  const table2col = `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0;">Earnings</th>
          <th style="padding:6px 10px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          <th style="padding:6px 10px;text-align:left;border:1px solid #e2e8f0;">${isContractor ? "Notes" : "Deductions"}</th>
          <th style="padding:6px 10px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(() => {
          const maxRows = Math.max(earnings.length, deductions.length);
          const rows: string[] = [];
          for (let i = 0; i < maxRows; i++) {
            const e = earnings[i];
            const d = deductions[i];
            rows.push(`<tr>
              <td style="padding:5px 10px;border:1px solid #e2e8f0;">${e?.name ?? ""}</td>
              <td style="padding:5px 10px;text-align:right;border:1px solid #e2e8f0;">${e ? fmtMoney(e.amount, currency) : ""}</td>
              <td style="padding:5px 10px;border:1px solid #e2e8f0;">${d?.name ?? ""}</td>
              <td style="padding:5px 10px;text-align:right;color:#b91c1c;border:1px solid #e2e8f0;">${d ? fmtMoney(d.amount, currency) : ""}</td>
            </tr>`);
          }
          return rows.join("");
        })()}
        <tr style="background:#f1f5f9;font-weight:700;">
          <td style="padding:6px 10px;border:1px solid #e2e8f0;">Gross</td>
          <td style="padding:6px 10px;text-align:right;border:1px solid #e2e8f0;">${fmtMoney(snapshot.totals.gross, currency)}</td>
          <td style="padding:6px 10px;border:1px solid #e2e8f0;">Total Deductions</td>
          <td style="padding:6px 10px;text-align:right;color:#b91c1c;border:1px solid #e2e8f0;">${fmtMoney(snapshot.totals.deductions, currency)}</td>
        </tr>
        ${employerRows ? `<tr><td colspan="4" style="padding:4px 10px;font-size:10px;font-weight:700;background:#f8fafc;border:1px solid #e2e8f0;">Employer Contributions</td></tr>${employerRows}` : ""}
      </tbody>
    </table>`;

  const netBar = `
    <div style="background:${accent};color:#fff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;font-weight:700;">Net ${isContractor ? "Payment" : "Salary"} Payable</span>
      <span style="font-size:18px;font-weight:800;">${fmtMoney(snapshot.totals.net, currency)}</span>
    </div>
    <div style="background:#f8fafc;padding:6px 20px;font-size:11px;font-style:italic;border-bottom:2px solid ${accent};">
      In words: <strong>${words}</strong>
    </div>`;

  const bankSection = `
    <div style="padding:12px 20px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;">Bank Details</div>
      ${employee.bankName ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="color:#64748b;">Bank</span><span>${employee.bankName}</span></div>` : ""}
      ${employee.maskedAccount ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="color:#64748b;">Account</span><span>${employee.maskedAccount}</span></div>` : ""}
      ${employee.ifsc ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="color:#64748b;">IFSC</span><span>${employee.ifsc}</span></div>` : ""}
    </div>`;

  const header = `
    <div style="display:flex;align-items:center;padding:16px 20px;border-bottom:3px solid ${accent};gap:14px;">
      <div style="flex:1;">
        <div style="font-size:20px;font-weight:700;color:${accent};">${org.name}</div>
        ${org.address ? `<div style="font-size:11px;color:#64748b;">${org.address}</div>` : ""}
      </div>
      <div style="text-align:right;">
        <div style="font-size:15px;font-weight:700;">${title}</div>
        <div style="font-size:11px;color:#64748b;">For the month of ${monthLabel}</div>
        <div style="display:inline-block;background:#15803d;color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:3px;margin-top:4px;">PAID</div>
      </div>
    </div>`;

  const footer = `
    <div style="background:#f9fafb;border-top:1px solid #e2e8f0;padding:8px 20px;font-size:10px;color:#94a3b8;text-align:center;">
      Generated ${new Date().toLocaleDateString("en-IN")} · ${org.name} · Confidential — For Employee Use Only
    </div>`;

  if (layout === "CLASSIC") {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${title} – ${employee.name} – ${monthLabel}</title></head><body style="font-family:Arial,'Segoe UI',sans-serif;background:#f0f0f0;color:#111;font-size:13px;margin:0;">
      <div style="max-width:800px;margin:20px auto;background:#fff;border:1px solid #ccc;">
        ${header}${empBar}
        <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e2e8f0;">
          <div style="padding:12px 20px;border-right:1px solid #e2e8f0;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};border-bottom:1px solid #e0e8ff;padding-bottom:4px;margin-bottom:8px;">Employee Info</div>
            ${employee.joiningDate ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="color:#64748b;">Date of Joining</span><span>${employee.joiningDate}</span></div>` : ""}
            ${employee.pan ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="color:#64748b;">PAN</span><span>${employee.pan}</span></div>` : ""}
          </div>
          <div style="padding:12px 20px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};border-bottom:1px solid #e0e8ff;padding-bottom:4px;margin-bottom:8px;">Payroll Info</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="color:#64748b;">Pay Period</span><span>${monthLabel}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="color:#64748b;">Paid Days</span><span>${parseFloat(snapshot.paidDays).toFixed(1)}</span></div>
          </div>
        </div>
        <div style="padding:0 20px 16px;">${table2col}</div>
        ${netBar}
        <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #e2e8f0;">
          ${bankSection}
          <div style="padding:12px 20px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;">Authorisation</div>
            <div style="font-size:11px;color:#64748b;">This is a system-generated payslip and does not require a physical signature.</div>
          </div>
        </div>
        ${footer}
      </div></body></html>`;
  }

  if (layout === "MODERN") {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${title} – ${employee.name} – ${monthLabel}</title></head><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#0f172a;font-size:14px;margin:0;padding:20px;">
      <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:${accent};color:#fff;padding:24px 28px;">
          <div style="font-size:22px;font-weight:800;">${org.name}</div>
          <div style="font-size:13px;opacity:0.75;margin-top:2px;">${title} · ${monthLabel}</div>
          <div style="margin-top:16px;display:flex;gap:32px;flex-wrap:wrap;">
            <div><div style="font-size:10px;opacity:0.65;text-transform:uppercase;">Employee</div><div style="font-size:14px;font-weight:600;">${employee.name}</div></div>
            <div><div style="font-size:10px;opacity:0.65;text-transform:uppercase;">ID</div><div style="font-size:14px;font-weight:600;">${employee.employeeId ?? "—"}</div></div>
            <div><div style="font-size:10px;opacity:0.65;text-transform:uppercase;">Designation</div><div style="font-size:14px;font-weight:600;">${employee.designation ?? "—"}</div></div>
          </div>
        </div>
        <div style="padding:24px 28px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${accent};letter-spacing:0.08em;margin-bottom:12px;">Earnings</div>
          ${earnings.map(l=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span>${l.name}</span><span style="font-weight:600;">${fmtMoney(l.amount,currency)}</span></div>`).join("")}
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;font-weight:700;"><span>Gross</span><span>${fmtMoney(snapshot.totals.gross,currency)}</span></div>
          ${!isContractor ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#ef4444;letter-spacing:0.08em;margin-top:16px;margin-bottom:12px;">Deductions</div>
          ${deductions.map(l=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span>${l.name}</span><span style="color:#ef4444;">${fmtMoney(l.amount,currency)}</span></div>`).join("")}` : ""}
          ${config.showEmployerContributions && !isContractor && employer.length > 0 ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.08em;margin-top:16px;margin-bottom:12px;">Employer Contributions</div>${employer.map(l=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span>${l.name}</span><span>${fmtMoney(l.amount,currency)}</span></div>`).join("")}` : ""}
        </div>
        <div style="background:#f8fafc;margin:0 28px;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
          <div><div style="font-size:11px;color:#64748b;">Net ${isContractor?"Payment":"Salary"} Payable</div><div style="font-size:12px;color:#64748b;font-style:italic;">${words}</div></div>
          <div style="font-size:24px;font-weight:800;color:${accent};">${fmtMoney(snapshot.totals.net,currency)}</div>
        </div>
        <div style="padding:20px 28px;border-top:1px solid #e2e8f0;margin-top:16px;">
          ${bankSection}
        </div>
        ${footer}
      </div></body></html>`;
  }

  // COMPLIANCE layout — dense, all components
  const allLines = snapshot.lines;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${title} – ${employee.name} – ${monthLabel}</title></head><body style="font-family:Arial,'Segoe UI',sans-serif;background:#fff;color:#111;font-size:11px;margin:0;">
    <div style="max-width:800px;margin:0 auto;border:1px solid #ccc;">
      ${header}${empBar}
      <div style="padding:10px 20px;border-bottom:1px solid #e2e8f0;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          ${[["Pay Period",monthLabel],["Paid Days",parseFloat(snapshot.paidDays).toFixed(1)],["LOP Days",parseFloat(snapshot.lopDays).toFixed(1)],["Policy Version",String(snapshot.policyVersionId??"—")]].map(([k,v])=>`<div style="font-size:10px;"><div style="color:#64748b;">${k}</div><div style="font-weight:600;">${v}</div></div>`).join("")}
        </div>
      </div>
      <div style="padding:10px 20px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};padding-bottom:4px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;">All Salary Components</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:5px 8px;text-align:left;border:1px solid #e2e8f0;">Component</th>
            <th style="padding:5px 8px;text-align:left;border:1px solid #e2e8f0;">Type</th>
            <th style="padding:5px 8px;text-align:left;border:1px solid #e2e8f0;">Method</th>
            <th style="padding:5px 8px;text-align:right;border:1px solid #e2e8f0;">Amount</th>
          </tr></thead>
          <tbody>
            ${allLines.filter(l => !isContractor || l.category === "EARNING" || l.category === "REIMBURSEMENT").map(l=>`<tr>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;">${l.name}</td>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;color:#64748b;">${l.category}</td>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;color:#64748b;">${l.calcMethod}</td>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right;${l.category==="DEDUCTION"||l.category==="TAX"?"color:#b91c1c;":""}">${fmtMoney(l.amount,currency)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${netBar}
      <div style="display:grid;grid-template-columns:1fr 1fr;padding:0;">
        ${bankSection}
        <div style="padding:12px 20px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${accent};border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;">Computed On</div>
          <div style="font-size:11px;color:#64748b;">${new Date(snapshot.computedAt).toLocaleString("en-IN")}</div>
          ${employee.pan ? `<div style="margin-top:6px;font-size:11px;"><span style="color:#64748b;">PAN: </span>${employee.pan}</div>` : ""}
        </div>
      </div>
      ${footer}
    </div></body></html>`;
}

export function buildPayslipPdfData(params: RenderParams): PayslipPdfData {
  const { snapshot, employee, org, workerType, month } = params;
  const currency = snapshot.currency;
  const monthLabel = fmtMonthYear(month);

  const basicLine = snapshot.lines.find(l => l.code === "BASIC" && l.category === "EARNING");
  const hraLine = snapshot.lines.find(l => l.code === "HRA" && l.category === "EARNING");
  const otLine = snapshot.lines.find(l => (l.code === "OT" || l.code === "OVERTIME") && l.category === "EARNING");
  const otherEarnings = snapshot.lines
    .filter(l => l.category === "EARNING" && l.code !== "BASIC" && l.code !== "HRA" && l.code !== "OT" && l.code !== "OVERTIME")
    .reduce((s, l) => s + parseFloat(l.amount), 0);

  const currencyPrefix = currency === "INR" ? "₹" : currency + " ";

  return {
    orgName: org.name,
    orgAddress: org.address,
    employeeName: employee.name,
    employeeId: employee.employeeId,
    designation: employee.designation,
    department: employee.department,
    panNumber: employee.pan,
    bankName: employee.bankName,
    maskedAccount: employee.maskedAccount,
    ifsc: employee.ifsc,
    joiningDate: employee.joiningDate,
    monthLabel,
    basicSalary: parseFloat(basicLine?.amount ?? "0"),
    hra: parseFloat(hraLine?.amount ?? "0"),
    allowances: otherEarnings,
    overtimeAmount: parseFloat(otLine?.amount ?? "0"),
    grossSalary: parseFloat(snapshot.totals.gross),
    deductions: parseFloat(snapshot.totals.deductions),
    netSalary: parseFloat(snapshot.totals.net),
  };
}
```

- [ ] **Verify tsc**: `pnpm -C backend exec tsc --noEmit`

---

## Task 3: Approvals Service

**Files:**
- Create: `backend/src/modules/payroll/payout/approvals.service.ts`

- [ ] **Create `approvals.service.ts`**

Key logic blocks:
```typescript
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../../db/drizzle.constants";
import type { Db } from "../../../db/drizzle.module";
import {
  payrollRuns, payrollRunEmployees, payrollExceptions, payrollApprovals,
  payrollRunEvents, payrollPolicyVersions,
} from "../../../db/schema";
import { AccessService } from "../../access/access.service";
import { canTransitionRun, DEFAULT_PAYROLL_TOGGLES, type PayrollPolicyConfig, type PayrollApprovalStageDef } from "../payroll.types";

@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly access: AccessService,
  ) {}

  async submitApproval(orgId: string, userId: string, runId: number) {
    // 1. Load run with org check (BOLA)
    // 2. Check status PREVIEW_READY or EXCEPTIONS_FOUND; 409 otherwise
    // 3. Check no OPEN BLOCKER exceptions
    // 4. Load policy version → toggles + config
    // 5. If !approvalWorkflow → auto-approve
    // 6. Build approval chain from config.approvalChain (default single stage if empty)
    // 7. Insert payrollApprovals rows, update run → PENDING_APPROVAL, write event
  }

  async listApprovals(orgId: string, runId: number) {
    // Verify run belongs to org, then return all payrollApprovals for this run
  }

  async approveStage(orgId: string, userId: string, runId: number, approvalId: number, comment?: string) {
    // 1. Load approval + run, verify org
    // 2. Verify requiredPermission via AccessService (org owner/platform admin bypass)
    // 3. Check stage order — must be next PENDING
    // 4. Maker-checker — cannot approve own submission
    // 5. Update approval APPROVED
    // 6. If last stage: update run APPROVED + event; if lockAfterApproval: also lock
  }

  async rejectStage(orgId: string, userId: string, runId: number, approvalId: number, comment: string) {
    // 1. Load approval + run, verify org
    // 2. Verify requiredPermission
    // 3. Check stage order
    // 4. Update approval REJECTED, update run PREVIEW_READY, write REJECTED event
  }
}
```

Full implementation (no pseudocode — write all logic):

```typescript
// submitApproval full:
async submitApproval(orgId: string, userId: string, runId: number) {
  const run = await this.db.query.payrollRuns.findFirst({
    where: and(eq(payrollRuns.id, runId), eq(payrollRuns.orgId, orgId)),
    with: { policyVersion: true },
  });
  if (!run) throw new NotFoundException("Payroll run not found");
  if (run.status !== "PREVIEW_READY" && run.status !== "EXCEPTIONS_FOUND") {
    throw new ConflictException(`Run must be PREVIEW_READY or EXCEPTIONS_FOUND to submit approval (current: ${run.status})`);
  }

  const blockers = await this.db.query.payrollExceptions.findMany({
    where: and(
      eq(payrollExceptions.runId, runId),
      eq(payrollExceptions.orgId, orgId),
      eq(payrollExceptions.severity, "BLOCKER"),
      eq(payrollExceptions.status, "OPEN"),
    ),
    columns: { id: true, code: true, message: true },
  });
  if (blockers.length > 0) {
    throw new BadRequestException(`Cannot submit: ${blockers.length} open blocker exception(s). Resolve or override them first.`);
  }

  const policyVersion = run.policyVersion;
  const toggles = (policyVersion?.toggles as Record<string, boolean> | null) ?? DEFAULT_PAYROLL_TOGGLES;
  const policyConfig = (policyVersion?.config as PayrollPolicyConfig | null);
  const approvalWorkflow = toggles["approvalWorkflow"] !== false;

  if (!approvalWorkflow) {
    await this.db.transaction(async (tx) => {
      await tx.update(payrollRuns).set({ status: "APPROVED", approvedAt: new Date(), approvedBy: userId })
        .where(eq(payrollRuns.id, runId));
      await tx.insert(payrollRunEvents).values([
        { orgId, runId, type: "APPROVAL_SUBMITTED", actorId: userId },
        { orgId, runId, type: "APPROVED", actorId: userId, metadata: { autoApproved: true } },
      ]);
    });
    return { autoApproved: true, runStatus: "APPROVED" as const };
  }

  const chain: PayrollApprovalStageDef[] = policyConfig?.approvalChain?.length
    ? policyConfig.approvalChain
    : [{ stage: 1, stageName: "Finance Approval", requiredPermission: "payroll:runs:approve" }];

  await this.db.transaction(async (tx) => {
    await tx.insert(payrollApprovals).values(
      chain.map(s => ({
        orgId, runId,
        stage: s.stage,
        stageName: s.stageName,
        requiredPermission: s.requiredPermission,
        status: "PENDING" as const,
      })),
    );
    await tx.update(payrollRuns).set({ status: "PENDING_APPROVAL" }).where(eq(payrollRuns.id, runId));
    await tx.insert(payrollRunEvents).values({ orgId, runId, type: "APPROVAL_SUBMITTED", actorId: userId });
  });

  return { autoApproved: false, runStatus: "PENDING_APPROVAL" as const, stagesCreated: chain.length };
}

async approveStage(orgId: string, userId: string, runId: number, approvalId: number, comment?: string) {
  const [approval, run] = await Promise.all([
    this.db.query.payrollApprovals.findFirst({
      where: and(eq(payrollApprovals.id, approvalId), eq(payrollApprovals.runId, runId), eq(payrollApprovals.orgId, orgId)),
    }),
    this.db.query.payrollRuns.findFirst({
      where: and(eq(payrollRuns.id, runId), eq(payrollRuns.orgId, orgId)),
      with: { policyVersion: true },
    }),
  ]);
  if (!approval || !run) throw new NotFoundException("Approval or run not found");
  if (approval.status !== "PENDING") throw new ConflictException("Approval already acted on");
  if (run.status !== "PENDING_APPROVAL") throw new ConflictException("Run is not in PENDING_APPROVAL status");

  // Verify stage is the next actionable one
  const allStages = await this.db.query.payrollApprovals.findMany({
    where: and(eq(payrollApprovals.runId, runId), eq(payrollApprovals.orgId, orgId)),
    orderBy: payrollApprovals.stage,
  });
  const nextPending = allStages.find(s => s.status === "PENDING");
  if (!nextPending || nextPending.id !== approvalId) {
    throw new ConflictException("This is not the next stage to approve");
  }

  // Permission check (org owners/platform admins bypass)
  const isPrivileged = (run as unknown as { orgId: string } & Record<string, unknown>).__isPrivileged;
  const perms = await this.access.resolveUserPermissions(orgId, userId);
  const memberRow = await this.db.query.organizationMembers?.findFirst?.({
    where: (t: unknown, { and: a, eq: e }: { and: typeof and; eq: typeof eq }) =>
      a(e((t as Record<string, unknown>).userId as string, userId), e((t as Record<string, unknown>).orgId as string, orgId)),
  });
  const isOrgOwner = (memberRow as Record<string, unknown> | undefined)?.isOwner === true;

  if (!isOrgOwner && !perms.has(approval.requiredPermission)) {
    throw new ForbiddenException(`Missing required permission: ${approval.requiredPermission}`);
  }

  // Maker-checker
  const submittedEvent = await this.db.query.payrollRunEvents.findFirst({
    where: and(eq(payrollRunEvents.runId, runId), eq(payrollRunEvents.type, "APPROVAL_SUBMITTED")),
  });
  if (submittedEvent?.actorId === userId) {
    throw new ForbiddenException("Maker-checker: the submitter cannot approve their own payroll");
  }

  const now = new Date();
  const isLastStage = allStages.every(s => s.id === approvalId || s.status === "APPROVED");
  const lockAfterApproval = ((run.policyVersion?.toggles as Record<string, boolean> | null) ?? DEFAULT_PAYROLL_TOGGLES)["lockAfterApproval"] !== false;

  await this.db.transaction(async (tx) => {
    await tx.update(payrollApprovals)
      .set({ status: "APPROVED", actedBy: userId, actedAt: now, comment: comment ?? null })
      .where(eq(payrollApprovals.id, approvalId));

    if (isLastStage) {
      const runUpdates: Record<string, unknown> = { status: "APPROVED", approvedAt: now, approvedBy: userId };
      const events: Array<{ orgId: string; runId: number; type: string; actorId: string; metadata?: Record<string, unknown> }> = [
        { orgId, runId, type: "APPROVED", actorId: userId },
      ];

      if (lockAfterApproval) {
        Object.assign(runUpdates, { status: "LOCKED", lockedAt: now, lockedBy: userId });
        events.push({ orgId, runId, type: "LOCKED", actorId: userId, metadata: { lockedAfterApproval: true } });
      }

      await tx.update(payrollRuns).set(runUpdates).where(eq(payrollRuns.id, runId));
      await tx.insert(payrollRunEvents).values(events as Parameters<typeof tx.insert>[0] extends infer T ? T extends { values: (v: infer V) => unknown } ? V : never : never);
    }
  });

  return { success: true, runStatus: isLastStage ? (lockAfterApproval ? "LOCKED" : "APPROVED") : "PENDING_APPROVAL" };
}
```

Note: The transaction event insert uses a type-safe approach — in practice call `tx.insert(payrollRunEvents).values(events)` without the generic gymnastics above.

- [ ] **Verify tsc on approvals.service.ts**

---

## Task 4: Approvals Controller

**Files:**
- Create: `backend/src/modules/payroll/payout/approvals.controller.ts`

```typescript
import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../access/permission.guard";
import { RequirePermission } from "../../access/require-permission.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import type { CurrentUserContext } from "../../../common/auth/backend-claims";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { ApprovalsService } from "./approvals.service";
import { approvalActionSchema, rejectActionSchema, type ApprovalActionInput, type RejectActionInput } from "./dto/payout.schemas";

@Controller("payroll/runs/:runId")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Post("submit-approval")
  @HttpCode(200)
  @RequirePermission("payroll:runs:update")
  async submitApproval(
    @Param("runId", ParseIntPipe) runId: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.approvals.submitApproval(u.orgId, u.userId, runId);
  }

  @Get("approvals")
  @RequirePermission("payroll:runs:view")
  async listApprovals(
    @Param("runId", ParseIntPipe) runId: number,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.approvals.listApprovals(u.orgId, runId);
  }

  @Post("approvals/:approvalId/approve")
  @HttpCode(200)
  @RequirePermission("payroll:runs:approve")
  async approveStage(
    @Param("runId", ParseIntPipe) runId: number,
    @Param("approvalId", ParseIntPipe) approvalId: number,
    @Body(new ZodValidationPipe(approvalActionSchema)) body: ApprovalActionInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.approvals.approveStage(u.orgId, u.userId, runId, approvalId, body.comment);
  }

  @Post("approvals/:approvalId/reject")
  @HttpCode(200)
  @RequirePermission("payroll:runs:approve")
  async rejectStage(
    @Param("runId", ParseIntPipe) runId: number,
    @Param("approvalId", ParseIntPipe) approvalId: number,
    @Body(new ZodValidationPipe(rejectActionSchema)) body: RejectActionInput,
    @CurrentUser() u: CurrentUserContext,
  ) {
    return this.approvals.rejectStage(u.orgId, u.userId, runId, approvalId, body.comment);
  }
}
```

---

## Task 5: Locking Service + Controller

**Files:**
- Create: `backend/src/modules/payroll/payout/locking.service.ts`
- Create: `backend/src/modules/payroll/payout/locking.controller.ts`

`locking.service.ts` key points:

- **lock()**: transaction → verify all runEmployees have non-null `calculationSnapshot` → fail with descriptive error if missing → set status LOCKED, lockedAt, lockedBy → write LOCKED event.
- **reopen()**: `canTransitionRun(run.status, "REOPENED")` → 409 if false → set REOPENED + reopenedAt/By/Reason → write REOPENED event with reason.
- **close()**: `canTransitionRun(run.status, "CLOSED")` → 409 if false → set closedAt only → **NO event** (no CLOSED enum value in `payrollRunEventTypeEnum`). Report this gap.

`locking.controller.ts`:
- `POST payroll/runs/:runId/lock` — `payroll:runs:manage`
- `POST payroll/runs/:runId/reopen` — `payroll:runs:manage` + body `{ reason }`
- `POST payroll/runs/:runId/close` — `payroll:runs:manage`

---

## Task 6: Payout Batches Service

**Files:**
- Create: `backend/src/modules/payroll/payout/payout-batches.service.ts`

Key methods:

**`validatePayout(runId, orgId)`:**
```typescript
// Join payrollRunEmployees → users to get bankDetails
// For each employee:
//   - decrypt bankDetails
//   - checks: missingAccount, invalidIfsc, zeroNet, negativeNet, onHold
//   - collect account numbers for dup detection
// Return: ValidationItem[] (masked account, checks[])
```

IFSC regex (INR only): `/^[A-Z]{4}0[A-Z0-9]{6}$/`

**`createBatch(runId, orgId, userId, idempotencyKey, format)`:**
```typescript
// 1. Check run status === "APPROVED" || "LOCKED"
// 2. If idempotencyKey: query existing → return with { replayed: true }
// 3. Load employees passing validation, not HELD
// 4. Decrypt bank details
// 5. Build CSV: "SrNo,EmployeeName,AccountNumber,IFSCCode,Amount,Narration"
// 6. Upload to R2: storageService.uploadFile(...)
// 7. batchNumber = PAY-${month.replace("-","")}-{padded seq}
// 8. DB transaction: insert batch + items
// 9. Write BANK_BATCH_GENERATED event with metadata: { batchNumber, fileKey }
// 10. Return batch + masked items + fileUrl (signed URL from R2)
```

**`markBatchSent(batchId, orgId)`:** batch SENT, sentAt, items PENDING→SENT.

**`markItemPaid(batchId, itemId, orgId, transactionRef)`:** item PAID + transactionRef + paidAt. Check if all run items PAID across all batches → run PAID + MARKED_PAID event + runEmployee.status="PAID".

**`markItemFailed(batchId, itemId, orgId, failureReason)`:** item FAILED.

**`markBatchPaid(batchId, orgId, userId, transactionRef)`:** all items in batch → PAID, then trigger the run-completion check.

**`getBankDetails(runEmployeeUserId, orgId, userId)`:** load user row, decrypt, log via AuditService, return full unmasked.

---

## Task 7: Payout Batches Controller

**Files:**
- Create: `backend/src/modules/payroll/payout/payout-batches.controller.ts`

Two controller classes:
1. `@Controller("payroll/runs/:runId/payout")` — validation + batch creation
2. `@Controller("payroll/payout")` — list batches, batch detail, mark-sent, mark-paid, item actions
3. `@Controller("payroll/employees/:employeeUserId")` — GET /bank

Read `Idempotency-Key` header via `@Headers("idempotency-key") idempotencyKey: string | undefined`.

---

## Task 8: Payslip Templates Service + Controller

**Files:**
- Create: `backend/src/modules/payroll/payout/payslip-templates.service.ts`
- Create: `backend/src/modules/payroll/payout/payslip-templates.controller.ts`

**Default seeds:**
```typescript
const DEFAULT_TEMPLATES = [
  { name: "Classic Table", layout: "CLASSIC", config: { accent: "#0f2b7f", showEmployerContributions: false, showYtd: false }, isDefault: true },
  { name: "Modern Compact", layout: "MODERN", config: { accent: "#3b82f6", showEmployerContributions: false, showYtd: false }, isDefault: false },
  { name: "Detailed Compliance", layout: "COMPLIANCE", config: { accent: "#1e293b", showEmployerContributions: true, showYtd: false }, isDefault: false },
];
```

**preview()**: Render with fake `CalculationSnapshot` containing sample BASIC (30000), HRA (12000), Special Allowance (8000) earnings + PF (1800), PT (200) deductions. Return `{ html }`.

**delete check**: if template.isDefault → 409 "Cannot delete the default template".

Controller at `@Controller("payroll/payslip-templates")`.

---

## Task 9: Publishing Service

**Files:**
- Create: `backend/src/modules/payroll/payout/publishing.service.ts`

**`publish(runId, orgId, userId, userIds?, policy)`:**
```typescript
// 1. Load run + verify org; check status === "PAID"
// 2. Load toggles
// 3. Load target runEmployees (filtered by userIds if provided)
// 4. Load active payslip template (org's isDefault=true one, or CLASSIC fallback)
// 5. Load employee + org info
// 6. For each employee (run in sequence to avoid hammering R2):
//    a. Compute snapshotHash = sha256(canonical JSON of calculationSnapshot)
//    b. Render HTML → buildPayslipPdfData → generatePayslipPdf → Buffer
//    c. Upload PDF to R2: "payroll/payslips/{runId}/{employeeId}.pdf"
//    d. Upsert payslipPublications (ON CONFLICT runEmployeeId → update)
//    e. If emailPayslips toggle: send email with PDF attachment
// 7. Check if all runEmployees now have status PUBLISHED → update run PAYSLIPS_PUBLISHED
// 8. Return { published, total, runStatus }
```

**`listPublications(runId, orgId)`:** simple query, no ESS restriction on list (caller has payroll:payslips:view).

**`downloadPdf(publicationId, caller)`:**
```typescript
// 1. Load publication
// 2. ESS check: if publication.userId === caller.userId → allow (no permission check)
//    else → verify payroll:payslips:view permission
// 3. Verify org membership for non-ESS callers
// 4. Load runEmployee snapshot
// 5. Compute sha256(JSON.stringify(snapshot)) — compare with snapshotHash
// 6. If mismatch → 409 "Published payslip snapshot has changed — contact HR"
// 7. Load employee + org info
// 8. Render PDF from snapshot using the template stored on the publication
// 9. Return Buffer with Content-Type: application/pdf
```

---

## Task 10: Publishing Controller

**Files:**
- Create: `backend/src/modules/payroll/payout/publishing.controller.ts`

```typescript
@Controller("payroll")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PublishingController {
  // POST /payroll/runs/:runId/payslips/publish → payroll:payslips:manage
  // GET  /payroll/runs/:runId/payslips        → payroll:payslips:view
  // GET  /payroll/payslips/:publicationId/download → payroll:payslips:view OR own
}
```

For download: `@Res({ passthrough: true }) res: Response` — set headers:
```typescript
res.set({
  "Content-Type": "application/pdf",
  "Content-Disposition": `attachment; filename="payslip-${month}.pdf"`,
  "Content-Length": String(buffer.length),
});
return new StreamableFile(buffer);
```

---

## Task 11: Module Wiring + tsc Clean

**Files:**
- Modify: `backend/src/modules/payroll/payout/payroll-payout.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { ApprovalsController } from "./approvals.controller";
import { LockingController } from "./locking.controller";
import { PayoutBatchesController } from "./payout-batches.controller";
import { PayslipTemplatesController } from "./payslip-templates.controller";
import { PublishingController } from "./publishing.controller";
import { ApprovalsService } from "./approvals.service";
import { LockingService } from "./locking.service";
import { PayoutBatchesService } from "./payout-batches.service";
import { PayslipTemplatesService } from "./payslip-templates.service";
import { PublishingService } from "./publishing.service";

@Module({
  controllers: [
    ApprovalsController,
    LockingController,
    PayoutBatchesController,
    PayslipTemplatesController,
    PublishingController,
  ],
  providers: [
    ApprovalsService,
    LockingService,
    PayoutBatchesService,
    PayslipTemplatesService,
    PublishingService,
  ],
})
export class PayrollPayoutModule {}
```

- [ ] **Run tsc on all owned files**: `pnpm -C backend exec tsc --noEmit`
- [ ] **Fix all errors in files under `payout/`**

---

## Report-Back Checklist

After implementation, report:
- [ ] Endpoint table confirmed (all 22 endpoints above wired)
- [ ] 3 layout config shapes confirmed: CLASSIC (#0f2b7f), MODERN (#3b82f6), COMPLIANCE (#1e293b)
- [ ] Bank file column format: `SrNo,EmployeeName,AccountNumber,IFSCCode,Amount,Narration`
- [ ] Storage mechanism: `StorageService.uploadFile()` (R2) — globally available, no import needed
- [ ] Idempotency: manual `Idempotency-Key` header → `payrollBankBatches.idempotencyKey` unique lookup
- [ ] Audit log: `AuditService.log()` (global) — used for bank detail access. No gap.
- [ ] CLOSED event gap: `payrollRunEventTypeEnum` has no CLOSED value — `close()` sets `closedAt` only, no event. Suggest adding "CLOSED" to the enum in a future migration.
- [ ] `payrollBankBatches` has no `bankFileUrl` column — R2 file key stored in `BANK_BATCH_GENERATED` event metadata only; signed URL returned in create-batch response.
- [ ] `payrollLockEvents` and `payslipPublishEvents` tables are dead — NOT used.
- [ ] Additions needed in `payroll.types.ts` (do NOT edit — document only):
  - `PayslipTemplateConfig` interface (currently only in `payout/dto/payout.schemas.ts`)
  - `RendererEmployeeInfo` and `RendererOrgInfo` interfaces (in `payout/lib/payslip-renderer.ts`)
  - These could be moved to `payroll.types.ts` in a future pass to centralize shared contracts
