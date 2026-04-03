# Quick Wins - Immediate Actions (No Dependencies)

These are fixes that can be done immediately without waiting for infrastructure changes.

---

## 1. Delete Dead Files (5 minutes)

```bash
# Verify and delete these files
rm -f task                          # User prompt file at root
rm -f test-drizzle.ts               # Debug file at root
rm -rf audit/                       # Old audit folder
rm -f lib/email-templates.ts        # Empty file
rm -f env.example                   # Duplicate of .env.example
```

## 2. Remove Unused Dependencies (2 minutes)

```bash
pnpm remove zustand tw-animate-css @ai-sdk/react
```

## 3. Fix Missing Alt Attributes (30 minutes)

Add `alt=""` or descriptive text to these files:

### `<img>` tags needing alt:
- `app/(dashboard)/chat/page.tsx` (4 instances)
- `app/(dashboard)/hr/expenses/create-expense-dialog.tsx`
- `components/projects/ticket-details-dialog.tsx`
- `components/timesheets/log-time-dialog.tsx`

### `<Image>` components needing alt:
- `app/(dashboard)/ceo/qr-code/page.tsx`
- `app/not-found.tsx`
- `app/page.tsx`
- `components/layout/app-sidebar.tsx`
- `components/timesheets/time-entry-detail-sheet.tsx`

## 4. Add Missing Protected Routes (5 minutes)

**File**: `middleware.ts`

Add `/notifications` and `/marketing` to `PROTECTED_ROUTES` array.

## 5. Fix Env Var Naming (10 minutes)

**File**: `.env.example`

```diff
- SMTP_PASSWORD=
+ SMTP_PASS=

- SMTP_FROM=
+ SMTP_FROM_EMAIL=

- GOOGLE_CLIENT_ID=
- GOOGLE_CLIENT_SECRET=
+ # Removed - not used

+ SENDGRID_FROM_EMAIL=
+ SMTP_FROM_NAME=
```

## 6. Create Missing Loading Files (45 minutes)

Create these `loading.tsx` files with basic skeleton:

```tsx
// Template for loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
```

Add to:
- `app/(auth)/forgot-password/loading.tsx`
- `app/(auth)/signin/loading.tsx`
- `app/(auth)/verify-email/loading.tsx`
- `app/(auth)/invitation/[token]/loading.tsx`
- `app/(dashboard)/crm/clients/[id]/loading.tsx`
- `app/(dashboard)/crm/leads/distribute/loading.tsx`
- `app/(dashboard)/digital-marketing/loading.tsx`
- `app/(dashboard)/digital-marketing/campaigns/loading.tsx`
- `app/(dashboard)/digital-marketing/leads/loading.tsx`
- `app/(dashboard)/digital-marketing/social/loading.tsx`
- `app/(dashboard)/settings/branches/loading.tsx`
- `app/(dashboard)/settings/roles/loading.tsx`

## 7. Create Missing Error Files (45 minutes)

Create these `error.tsx` files with basic error boundary:

```tsx
// Template for error.tsx
"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {error.message || "An unexpected error occurred"}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

Add to:
- `app/(dashboard)/ceo/qr-code/error.tsx`
- `app/(dashboard)/hr/attendance/error.tsx`
- `app/(dashboard)/hr/employees/new/error.tsx`
- `app/(dashboard)/hr/payroll/error.tsx`
- `app/(dashboard)/hr/work-logs/error.tsx`

## 8. Fix Hardcoded localhost (20 minutes)

Replace in these files:

```typescript
// Instead of:
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Use (with validation):
import { env } from "@/lib/env";
const baseUrl = env.NEXT_PUBLIC_APP_URL;
```

Files to update:
- `app/(dashboard)/ceo/qr-code/actions.ts`
- `app/api/qr-code/download/route.ts`
- `lib/email/sender.ts`
- `lib/email-templates/base.ts`
- `lib/email.ts`
- `lib/notifications/send.ts`
- `lib/trpc.ts`

## 9. Replace window.confirm/prompt (30 minutes)

Use AlertDialog instead of native dialogs:

Files to update:
- `app/(dashboard)/crm/deals/page.tsx`
- `app/(dashboard)/crm/deals/[dealId]/page.tsx`
- `app/(dashboard)/hr/leaves/leaves-shared.tsx`
- `app/(dashboard)/hr/work-logs/page.tsx`
- `components/crm/lead-table-view.tsx`

## 10. Centralize Pipeline Constants (15 minutes)

Create `lib/constants/pipeline.ts`:

```typescript
export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export const DEAL_STAGES = [
  "Discovery",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;

export const STAGE_COLORS = {
  NEW: "#3B82F6",
  CONTACTED: "#8B5CF6",
  INTERESTED: "#F59E0B",
  QUALIFIED: "#10B981",
  CONVERTED: "#059669",
  LOST: "#EF4444",
} as const;

export type LeadStage = (typeof LEAD_STAGES)[number];
export type DealStage = (typeof DEAL_STAGES)[number];
```

---

## Estimated Total Time: 3-4 hours

These quick wins can be done in a single session and will immediately improve code quality without requiring infrastructure changes.

---

## Commands to Run After

```bash
# Verify everything still works
pnpm lint
pnpm build
pnpm test
```
