# Task 02: Database & Schema Cleanup

## Priority: 🔴 CRITICAL

### 2.1 Add Audit Columns to All Mutable Tables

Add `updatedBy: text("updated_by").references(() => users.id)` to:
- leads, deals, contacts, targets, clients, expenses, payrolls
- attendance, leaveRequests, documents, performanceReviews, goals
- tickets, projects, supportTickets, invoices, clientAccounts

---

### 2.2 Add Soft Delete Pattern

Add to major tables:
```
deletedAt: timestamp("deleted_at")
deletedBy: text("deleted_by").references(() => users.id)
```

Tables: leads, deals, contacts, clients, expenses, documents, projects, tickets, invoices

Add `.where(isNull(table.deletedAt))` to all list queries by default.

---

### 2.3 Delete/Merge Duplicate CRM Tables

**Tables to evaluate for deletion** (appear to be seeded demo data, not real pipeline):
- `crm_people`
- `crm_companies`
- `crm_deals`
- `crm_campaigns` — KEEP (used by real leads.campaignId)
- `crm_leads`
- `crm_content`
- `crm_events`
- `crm_activities`
- `crm_support_tickets`
- `crm_monthly_metrics`
- `crm_team_performance`
- `crm_support_team_members`

⚠️ Requires confirmation from user — check if any are actively queried in production.

---

### 2.4 Add Missing Indexes

```typescript
// notifications
index("idx_notifications_user_unread").on(table.userId, table.isRead)

// expenses
index("idx_expenses_org_user_date").on(table.orgId, table.userId, table.expenseDate)

// clients
index("idx_clients_account_manager").on(table.accountManagerId)

// payrolls
index("idx_payrolls_user").on(table.userId)
```

---

### 2.5 Enhance Organizations Table

Add columns:
- `logo: text("logo")`
- `website: text("website")`
- `industry: text("industry")`
- `timezone: text("timezone").default("Asia/Kolkata")`
- `currency: text("currency").default("INR")`
- `fiscalYearStart: integer("fiscal_year_start").default(4)` (April)
- `settings: jsonb("settings")`
- `billingEmail: text("billing_email")`
- `address: jsonb("address")`

---

### 2.6 Add Push Subscription Table

```typescript
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_push_subs_user").on(table.userId),
]);
```

---

### 2.7 Add Calendar Events Table

```typescript
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  allDay: boolean("all_day").default(false),
  color: text("color"),
  category: text("category").notNull(), // leave, meeting, deadline, holiday, appraisal, followup
  entityType: text("entity_type"), // lead, deal, ticket, employee
  entityId: text("entity_id"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  attendeeIds: jsonb("attendee_ids").$type<string[]>().default([]),
  isRecurring: boolean("is_recurring").default(false),
  recurringRule: text("recurring_rule"), // RRULE format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_calendar_events_org_date").on(table.orgId, table.startDate),
  index("idx_calendar_events_category").on(table.category),
  index("idx_calendar_events_created_by").on(table.createdBy),
]);
```

**Acceptance Criteria**:
- `pnpm db:generate` creates migration
- `pnpm db:push` applies without errors
- All existing queries still work
- Build passes
