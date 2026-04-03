# Task 17: Billing & Invoicing Enhancement

## Priority: MEDIUM | Effort: 4-5 days | Dependencies: Task 03 (API) | Status: NOT STARTED

---

## PRD

### Problem Statement
The billing module has basic pages but lacks full functionality:
1. **Basic invoice CRUD exists** via tRPC `invoice` router but UI is minimal
2. **No payment tracking**: Can't record payments against invoices
3. **No recurring invoices**: No auto-generation for retainers/subscriptions
4. **No invoice PDF generation**: jspdf installed but not integrated with invoices
5. **No payment reminders**: No automated overdue notifications
6. **No client portal**: Clients can't view/pay invoices online
7. **No tax calculations**: No GST/VAT support
8. **No expense-to-invoice**: Can't bill expenses to clients
9. **No financial dashboard**: No revenue, outstanding, overdue metrics

### Goals
- Build complete invoice management with PDF generation
- Add payment recording and tracking
- Implement recurring invoice generation
- Add automated payment reminders (email + notification)
- Build financial dashboard with key metrics
- Add tax calculation support (GST for India)
- Enable expense billing to clients

### Non-Goals
- Payment gateway integration (Razorpay/Stripe) - future
- Client self-service portal - future
- Accounting module (P&L, balance sheet) - separate product
- Multi-currency support - future

### Success Criteria
- Invoices can be created, sent, and tracked through lifecycle
- PDF invoices generated with professional template
- Payments recorded against invoices
- Recurring invoices auto-generated on schedule
- Overdue invoices trigger automated reminders
- Financial dashboard shows revenue and outstanding metrics

---

## Rules to Follow

1. **Invoice Numbering**: Auto-increment per org (e.g., INV-2024-001)
2. **Immutable After Send**: Sent invoices can't be modified, only credited/voided
3. **Audit Trail**: Every invoice state change logged
4. **Currency**: Default INR, support configuration per org
5. **Tax**: GST calculation (CGST + SGST or IGST) based on state
6. **Amount Precision**: Use `numeric(12, 2)` for all monetary values

---

## Implementation Steps

### Step 1: Database Schema Enhancements

**Enhance existing invoices table** (add missing fields):
```ts
// New fields for invoices table
invoiceNumber: text("invoice_number").notNull(), // auto-generated
taxRate: numeric("tax_rate"),
taxAmount: numeric("tax_amount"),
subtotal: numeric("subtotal"),
discount: numeric("discount"),
notes: text("notes"),
terms: text("terms"),
sentAt: timestamp("sent_at"),
viewedAt: timestamp("viewed_at"),
isRecurring: boolean("is_recurring").default(false),
recurringInterval: text("recurring_interval"), // "monthly", "quarterly", "yearly"
nextRecurringDate: timestamp("next_recurring_date"),
```

**New table: payments**
```ts
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  amount: numeric("amount").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(), // "bank_transfer", "upi", "cheque", "cash", "card"
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Step 2: Invoice PDF Generation

**File**: `lib/invoice-pdf.ts` (NEW)
```ts
// Use jspdf (already installed) to generate professional invoice PDF
// Template includes:
// - Company logo + details
// - Client details
// - Invoice number, date, due date
// - Line items table (description, qty, rate, amount)
// - Subtotal, tax breakdown (CGST, SGST), total
// - Payment terms
// - Bank details
```

### Step 3: Invoice Management Pages

**Files**:
- `app/(dashboard)/billing/page.tsx` - Financial dashboard (rewrite)
- `app/(dashboard)/billing/invoices/page.tsx` - Invoice list (enhance)
- `app/(dashboard)/billing/invoices/[id]/page.tsx` - Invoice detail
- `app/(dashboard)/billing/invoices/new/page.tsx` - Create invoice
- `app/(dashboard)/billing/payments/page.tsx` - Payment history

### Step 4: Financial Dashboard

```
┌─────────────────────────────────────────────────┐
│ Financial Overview                               │
├──────────┬──────────┬──────────┬────────────────┤
│ Total    │ Received │ Outstand-│ Overdue        │
│ Invoiced │ (Paid)   │ ing      │ Amount         │
├──────────┴──────────┴──────────┴────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐ │
│ │ Revenue Trend       │ │ Invoice Status      │ │
│ │ (Area Chart)        │ │ Distribution (Pie)  │ │
│ └─────────────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Recent Invoices                    [View All →] │
│ Overdue Invoices                   [View All →] │
└─────────────────────────────────────────────────┘
```

### Step 5: Automated Payment Reminders

**Via Inngest** (Task 06):
- 3 days before due: "Payment reminder - Invoice INV-2024-001"
- On due date: "Payment due today - Invoice INV-2024-001"
- 7 days overdue: "Overdue notice - Invoice INV-2024-001"
- 30 days overdue: Final notice with escalation

### Step 6: Recurring Invoices

**Via Inngest cron**:
- Daily check for invoices where `nextRecurringDate <= today`
- Auto-generate new invoice from template
- Update `nextRecurringDate` based on interval
- Send notification to client

---

## Checklist

- [ ] Add missing fields to invoices table migration
- [ ] Create payments table migration
- [ ] Implement invoice number auto-generation
- [ ] Build invoice PDF generation template
- [ ] Build financial dashboard page
- [ ] Enhance invoice list page with filters
- [ ] Build invoice detail page with payment tracking
- [ ] Build create invoice form with line items
- [ ] Build payment recording form
- [ ] Add tax calculation (GST)
- [ ] Implement payment reminder cron via Inngest
- [ ] Implement recurring invoice generation
- [ ] Add download PDF button on invoice detail
- [ ] Add send invoice via email functionality
- [ ] Update sidebar with billing sub-navigation
- [ ] Add loading/error/empty states
- [ ] `pnpm build` passes

---

## Acceptance Criteria

1. Invoice lifecycle: Draft → Sent → Viewed → Paid/Overdue
2. PDF invoice downloads with professional template
3. Payments recorded and reflected in invoice balance
4. Recurring invoices auto-generated on schedule
5. Overdue reminders sent automatically
6. Financial dashboard shows real-time metrics
7. Tax calculated correctly based on configuration
