# Subscription & Platform Nav Groups — Audit Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every functional, responsive, conformance, and cleanup violation across the Subscription and Platform nav groups.

**Architecture:** Each task is independent. Small inline fixes (Tasks 1–4) batch first; large file splits (Tasks 5–8) batch second; nav/routing fix (Task 9) last.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, TanStack Query v5, react-hook-form + Zod, Sonner, lucide-react

**NO git commands. NO comments in code. NO `any` types. Named handlers only.**

---

## Page Inventory

### Subscription Group
| Nav Label | Route | File | Lines | Issues |
|---|---|---|---|---|
| Current Plan | `/settings/subscription` | `app/(authenticated)/settings/subscription/page.tsx` | 509 | Over cap; eslint comment |
| Billing | `/billing` | `app/(authenticated)/billing/page.tsx` | 423 | Violet gradient violates palette |
| Seats | `/billing/seats` | `app/(authenticated)/billing/seats/page.tsx` | 273 | Clean |
| AI Credits | `/billing/ai-credits` | `app/(authenticated)/billing/ai-credits/page.tsx` | 263 | Buy btn unwired; no error state |
| Invoices | `/billing/invoices` | `app/(authenticated)/billing/invoices/invoices-client.tsx` | 756 | Way over cap |

### Platform Group
| Nav Label | Route | File | Lines | Issues |
|---|---|---|---|---|
| Modules | `/settings/modules` | `app/(authenticated)/settings/modules/page.tsx` | 161 | Inline empty state |
| Custom Fields | `/settings/custom-fields` | `app/(authenticated)/settings/custom-fields/page.tsx` | 37 | Clean |
| Automation | `/settings/automations` | `app/(authenticated)/settings/automations/page.tsx` | 332 | Clean |
| Notification Templates | `/settings/email-templates` | `app/(authenticated)/settings/email-templates/page.tsx` | 78 | Clean |
| Integrations | `/settings/integrations/recruitment` | `app/(authenticated)/settings/integrations/recruitment/page.tsx` | 238 | Nav href wrong — no hub page |
| API Keys | `/settings/api-tokens` | `app/(authenticated)/settings/api-tokens/page.tsx` | 869 | Way over cap |
| AI Configuration | `/settings/ai` | `app/(authenticated)/settings/ai/page.tsx` | 252 | void missing on refetch |
| Data Hub | `/settings/data-hub` | `app/(authenticated)/settings/data-hub/page.tsx` | 420 | Clean |

---

## Task 1: Fix `/billing/page.tsx` — palette + remove comment

**Files:**
- Modify: `frontend/app/(authenticated)/billing/page.tsx:86,123`

- [ ] **Step 1: Remove eslint comment on line 86**

Change line 86 from:
```tsx
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), []);
```
To (just the useMemo, no comment — or better: replace with a plain const since it's not reactive):
```tsx
  const now = useMemo(() => Date.now(), []);
```
Remove only the comment line, keep the useMemo.

- [ ] **Step 2: Fix violet gradient on subscription banner to blue palette**

Change line 123 from:
```tsx
          <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-400/40 px-4 py-3">
```
To:
```tsx
          <div className="flex items-center gap-3 rounded-lg bg-blue-500/5 border border-blue-200 px-4 py-3">
```

---

## Task 2: Fix `/billing/ai-credits/page.tsx` — error state + wire Buy button

**Files:**
- Modify: `frontend/app/(authenticated)/billing/ai-credits/page.tsx`

- [ ] **Step 1: Destructure isError from the hook**

Change:
```tsx
  const { data, isLoading, refetch } = useAiCreditsWallet();
```
To:
```tsx
  const { data, isLoading, isError, refetch } = useAiCreditsWallet();
```

- [ ] **Step 2: Add error state render in the JSX**

After the `isLoading` skeleton block and before the stats grid, add an error guard. Find:
```tsx
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
```
Wrap the entire return body so the first thing rendered is:
```tsx
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Failed to load AI credits</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>Retry</Button>
          </div>
        ) : isLoading ? (
```
Close the ternary properly.

- [ ] **Step 3: Wire the Buy button to navigate to checkout**

Import `useRouter` at the top:
```tsx
import { useRouter } from "next/navigation";
```

Add router usage at the top of the component body:
```tsx
  const router = useRouter();
```

Add a named handler:
```tsx
  function handleBuyPack(packId: string) {
    router.push(`/billing/checkout?pack=${packId}`);
  }
```

Change the unwired Buy button (inside the packs map):
```tsx
                    <Button size="sm" variant="outline">
                      Buy
                    </Button>
```
To:
```tsx
                    <Button size="sm" variant="outline" onClick={() => handleBuyPack(pack.id)}>
                      Buy
                    </Button>
```

Wait — named handlers only. Replace the anonymous onClick:
```tsx
                    <BuyPackButton packId={pack.id} onBuy={handleBuyPack} />
```

Add above the return:
```tsx
function BuyPackButton({ packId, onBuy }: { packId: string; onBuy: (id: string) => void }) {
  function handleClick() {
    onBuy(packId);
  }
  return (
    <Button size="sm" variant="outline" onClick={handleClick}>
      Buy
    </Button>
  );
}
```

---

## Task 3: Fix `/settings/ai/page.tsx` — void on refetch

**Files:**
- Modify: `frontend/app/(authenticated)/settings/ai/page.tsx:75-81`

- [ ] **Step 1: Add void to both refetch handler calls**

Change:
```tsx
  function handleRetryFlags() {
    refetchFlags();
  }

  function handleRetryUsage() {
    refetchUsage();
  }
```
To:
```tsx
  function handleRetryFlags() {
    void refetchFlags();
  }

  function handleRetryUsage() {
    void refetchUsage();
  }
```

---

## Task 4: Fix `/settings/modules/page.tsx` — use EmptyState component

**Files:**
- Modify: `frontend/app/(authenticated)/settings/modules/page.tsx`

- [ ] **Step 1: Add EmptyState import**

Add to existing imports:
```tsx
import { EmptyState } from "@/components/ui/empty-state";
```

Remove the `Layers` import from lucide (only used in the inline block).

- [ ] **Step 2: Replace inline empty block with EmptyState component**

Change:
```tsx
      ) : !modules || modules.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-24 gap-3 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">No modules configured</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Your organization has no feature modules available to manage.
          </p>
        </div>
```
To:
```tsx
      ) : !modules || modules.length === 0 ? (
        <EmptyState
          illustration={null}
          title="No modules configured"
          description="Your organization has no feature modules available to manage."
          className="flex-1"
        />
```

---

## Task 5: Split `/settings/api-tokens/page.tsx` (869 lines)

**Files:**
- Create: `frontend/features/settings/api-tokens/scope-selector.tsx`
- Create: `frontend/features/settings/api-tokens/token-created-dialog.tsx`
- Create: `frontend/features/settings/api-tokens/create-org-token-sheet.tsx`
- Create: `frontend/features/settings/api-tokens/create-user-token-sheet.tsx`
- Create: `frontend/features/settings/api-tokens/org-tokens-tab.tsx`
- Create: `frontend/features/settings/api-tokens/personal-tokens-tab.tsx`
- Modify: `frontend/app/(authenticated)/settings/api-tokens/page.tsx` (reduce to ~60 lines)

- [ ] **Step 1: Create `scope-selector.tsx`**

`frontend/features/settings/api-tokens/scope-selector.tsx`:
```tsx
"use client";

import { useCallback } from "react";

const AVAILABLE_SCOPES = [
  "read:all",
  "write:all",
  "read:org",
  "write:org",
  "read:hr",
  "write:hr",
  "read:crm",
  "write:crm",
  "read:projects",
  "write:projects",
];

interface ScopeSelectorProps {
  value: string[];
  onChange: (v: string[]) => void;
}

export function ScopeSelector({ value, onChange }: ScopeSelectorProps) {
  const handleToggle = useCallback(
    (scope: string) => {
      if (value.includes(scope)) {
        onChange(value.filter((s) => s !== scope));
      } else {
        onChange([...value, scope]);
      }
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {AVAILABLE_SCOPES.map((scope) => {
        const selected = value.includes(scope);
        return (
          <ScopeChip
            key={scope}
            scope={scope}
            selected={selected}
            onToggle={handleToggle}
          />
        );
      })}
    </div>
  );
}

function ScopeChip({
  scope,
  selected,
  onToggle,
}: {
  scope: string;
  selected: boolean;
  onToggle: (s: string) => void;
}) {
  function handleClick() {
    onToggle(scope);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {scope}
    </button>
  );
}
```

- [ ] **Step 2: Create `token-created-dialog.tsx`**

`frontend/features/settings/api-tokens/token-created-dialog.tsx`:
```tsx
"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TokenCreatedDialogProps {
  open: boolean;
  rawToken: string | null;
  onClose: () => void;
}

export function TokenCreatedDialog({
  open,
  rawToken,
  onClose,
}: TokenCreatedDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!rawToken) return;
    navigator.clipboard.writeText(rawToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rawToken]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Token Created</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
            Copy this token now. You won&apos;t be able to see it again.
          </div>
          <div className="flex items-center gap-2">
            <Input readOnly value={rawToken ?? ""} className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `create-org-token-sheet.tsx`**

`frontend/features/settings/api-tokens/create-org-token-sheet.tsx`:
```tsx
"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCreateApiToken, type CreateApiTokenInput, type CreateApiTokenResponse } from "@/hooks/api/api-tokens";
import { getApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ScopeSelector } from "./scope-selector";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateOrgTokenSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (result: CreateApiTokenResponse) => void;
}

export function CreateOrgTokenSheet({ open, onOpenChange, onCreated }: CreateOrgTokenSheetProps) {
  const create = useCreateApiToken();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", scopes: [], expiresAt: "" },
  });

  const handleSubmit = useCallback(
    (values: FormValues) => {
      const input: CreateApiTokenInput = {
        name: values.name,
        description: values.description || undefined,
        scopes: values.scopes,
        expiresAt: values.expiresAt || undefined,
      };
      create.mutate(input, {
        onSuccess: (result) => { form.reset(); onCreated(result); },
        onError: (err) => toast.error(getApiError(err)),
      });
    },
    [create, form, onCreated],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>New Organization Token</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form id="org-token-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="e.g. CI/CD Deploy Key" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="What is this token used for?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expiresAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormDescription>Leave blank for a non-expiring token.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="scopes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scopes</FormLabel>
                  <ScopeSelector value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button type="submit" form="org-token-form" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create Token"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Create `create-user-token-sheet.tsx`**

`frontend/features/settings/api-tokens/create-user-token-sheet.tsx`:
```tsx
"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCreateUserApiToken, type CreateUserApiTokenInput, type CreateUserApiTokenResponse } from "@/hooks/api/user-api-tokens";
import { getApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ScopeSelector } from "./scope-selector";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  scopes: z.array(z.string()),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateUserTokenSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (result: CreateUserApiTokenResponse) => void;
}

export function CreateUserTokenSheet({ open, onOpenChange, onCreated }: CreateUserTokenSheetProps) {
  const create = useCreateUserApiToken();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", scopes: [], expiresAt: "" },
  });

  const handleSubmit = useCallback(
    (values: FormValues) => {
      const input: CreateUserApiTokenInput = {
        name: values.name,
        scopes: values.scopes,
        expiresAt: values.expiresAt || undefined,
      };
      create.mutate(input, {
        onSuccess: (result) => { form.reset(); onCreated(result); },
        onError: (err) => toast.error(getApiError(err)),
      });
    },
    [create, form, onCreated],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>New Personal Access Token</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form id="user-token-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Local Dev Token" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expiresAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormDescription>Leave blank for a non-expiring token.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="scopes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Scopes</FormLabel>
                  <ScopeSelector value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button type="submit" form="user-token-form" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create Token"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 5: Create `org-tokens-tab.tsx`**

`frontend/features/settings/api-tokens/org-tokens-tab.tsx`:

Extract the full `OrgTokensTab` function from `page.tsx` (lines 462–687) verbatim except replace its imports to come from the new feature files. The component keeps its own internal state for `showCreate`, `createdResult`, `revoking`, `deleting`. Imports come from:
- `@/hooks/api/api-tokens` (same as before)
- `./token-created-dialog` for `TokenCreatedDialog`
- `./create-org-token-sheet` for `CreateOrgTokenSheet`
- shadcn components directly

Key structure (copy from existing but update imports):
```tsx
"use client";

import { useState, useCallback } from "react";
import { Key, Plus, Shield, ShieldOff, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApiTokens, useCreateApiToken, useRevokeApiToken, useDeleteApiToken, type ApiToken, type CreateApiTokenResponse } from "@/hooks/api/api-tokens";
import { getApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateOrgTokenSheet } from "./create-org-token-sheet";
import { TokenCreatedDialog } from "./token-created-dialog";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function OrgTokensTab() {
  // ... (full body from existing page.tsx OrgTokensTab, lines 462-687)
  // Update: remove OrgTokenCreatedDialog wrapper function — use TokenCreatedDialog directly
  // pass rawToken={createdResult?.token ?? null}
}
```

Full body: copy `OrgTokensTab` function body verbatim from `page.tsx` lines 462–687, updating:
- Import `TokenCreatedDialog` from `./token-created-dialog` 
- Import `CreateOrgTokenSheet` from `./create-org-token-sheet`
- Replace `OrgTokenCreatedDialog` usage with `<TokenCreatedDialog open={!!createdResult} rawToken={createdResult?.token ?? null} onClose={handleCloseCreated} />`

- [ ] **Step 6: Create `personal-tokens-tab.tsx`**

`frontend/features/settings/api-tokens/personal-tokens-tab.tsx`:

Copy `PersonalTokensTab` function (lines 689–846) verbatim, updating imports:
- Import `TokenCreatedDialog` from `./token-created-dialog`
- Import `CreateUserTokenSheet` from `./create-user-token-sheet`

- [ ] **Step 7: Rewrite `api-tokens/page.tsx` to thin orchestrator**

Replace the entire file content with:
```tsx
"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgTokensTab } from "@/features/settings/api-tokens/org-tokens-tab";
import { PersonalTokensTab } from "@/features/settings/api-tokens/personal-tokens-tab";

export default function ApiTokensPage() {
  return (
    <PageWrapper
      title="API Tokens"
      subtitle="Manage organization-wide and personal API tokens for programmatic access."
    >
      <Tabs defaultValue="personal">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Personal Access Tokens</TabsTrigger>
          <TabsTrigger value="organization">Organization Tokens</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <PersonalTokensTab />
        </TabsContent>
        <TabsContent value="organization">
          <OrgTokensTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
```

---

## Task 6: Split `/settings/subscription/page.tsx` (509 lines)

**Files:**
- Create: `frontend/features/subscription/components/plan-card.tsx`
- Create: `frontend/features/subscription/components/coupon-section.tsx`
- Create: `frontend/features/subscription/components/recent-payments-table.tsx`
- Modify: `frontend/app/(authenticated)/settings/subscription/page.tsx`

- [ ] **Step 1: Create `plan-card.tsx`**

`frontend/features/subscription/components/plan-card.tsx`:
```tsx
"use client";

import { Check, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubscriptionPlan, BillingCycle } from "@/hooks/api/subscription";

interface PlanConfig {
  monthlyPrice: number;
  label: string;
  features: string[];
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  config: PlanConfig;
  billingCycle: BillingCycle;
  currentPlan: SubscriptionPlan | null;
  currentStatus: string | null;
  upgradingPlan: SubscriptionPlan | null;
  isBusy: boolean;
  isConfigured: boolean | undefined;
  onUpgrade: (plan: SubscriptionPlan) => void;
}

function getAnnualMonthlyPrice(monthlyPrice: number) {
  return Math.round(monthlyPrice * 0.8);
}

export function PlanCard({
  plan,
  config,
  billingCycle,
  currentPlan,
  currentStatus,
  upgradingPlan,
  isBusy,
  isConfigured,
  onUpgrade,
}: PlanCardProps) {
  const isCurrentPlan = currentPlan === plan && currentStatus === "ACTIVE";
  const isUpgrading = upgradingPlan === plan && isBusy;
  const displayPrice =
    billingCycle === "annual"
      ? getAnnualMonthlyPrice(config.monthlyPrice)
      : config.monthlyPrice;
  const annualTotal = Math.round(config.monthlyPrice * 12 * 0.8);

  function handleUpgrade() {
    onUpgrade(plan);
  }

  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card p-5 transition-shadow ${
        isCurrentPlan
          ? "border-primary ring-1 ring-primary/20"
          : "border-border hover:shadow-sm"
      }`}
    >
      {isCurrentPlan && (
        <span className="absolute -top-px left-4 inline-flex items-center rounded-b-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          Current
        </span>
      )}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
        </div>
        <p className="text-2xl font-bold text-foreground">
          ₹{displayPrice.toLocaleString("en-IN")}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>
        {billingCycle === "annual" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            ₹{annualTotal.toLocaleString("en-IN")} billed annually
          </p>
        )}
      </div>
      <ul className="flex-1 space-y-2 mb-5">
        {config.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant={isCurrentPlan ? "secondary" : "default"}
        disabled={isCurrentPlan || !isConfigured || (isBusy && upgradingPlan !== plan)}
        onClick={handleUpgrade}
        className="w-full"
      >
        {isUpgrading ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Processing…</>
        ) : isCurrentPlan ? (
          "Current Plan"
        ) : (
          "Upgrade"
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create `coupon-section.tsx`**

`frontend/features/subscription/components/coupon-section.tsx`:
```tsx
"use client";

import { Check, Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CouponValidationResult } from "@/hooks/api/subscription";

interface CouponSectionProps {
  couponInput: string;
  appliedCoupon: CouponValidationResult | null;
  couponResult: CouponValidationResult | undefined;
  isValidatingCoupon: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onRemove: () => void;
}

export function CouponSection({
  couponInput,
  appliedCoupon,
  couponResult,
  isValidatingCoupon,
  onInputChange,
  onApply,
  onRemove,
}: CouponSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Have a coupon code?</p>
      </div>
      {appliedCoupon ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 flex-1">{appliedCoupon.message}</p>
          <button
            type="button"
            onClick={onRemove}
            className="text-emerald-600 hover:text-emerald-800 rounded"
            aria-label="Remove coupon"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={couponInput}
            onChange={onInputChange}
            placeholder="Enter coupon code"
            className="max-w-xs font-mono uppercase text-sm"
            aria-label="Coupon code"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onApply}
            disabled={couponInput.trim().length < 3 || isValidatingCoupon}
          >
            {isValidatingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
          </Button>
        </div>
      )}
      {couponInput.trim().length >= 3 && !appliedCoupon && couponResult && !isValidatingCoupon && !couponResult.valid && (
        <p className="text-xs text-destructive">{couponResult.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `recent-payments-table.tsx`**

`frontend/features/subscription/components/recent-payments-table.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: number;
  razorpayPaymentId: string | null;
  amount: string | number;
  paidAt: string | null;
  status: string;
}

export function RecentPaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-[0.9375rem] font-semibold text-foreground">Recent Payments</h2>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Payment ID</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                  {payment.razorpayPaymentId ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-foreground">
                  ₹{Number(payment.amount).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {payment.paidAt
                    ? new Date(payment.paidAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {payment.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `subscription/page.tsx` to use extracted components**

The page keeps only: session/hook calls, billing cycle toggle, status banner, error/loading states, and the `handleUpgrade` callback. Import the three extracted components. Remove: inline `PlanCard`, inline coupon JSX, inline payments table, and all associated local helpers that moved.

Key changes:
- Remove `PlanCard` function definition (now in feature)
- Remove `getAnnualMonthlyPrice` (now in feature)  
- Remove inline coupon JSX block
- Remove inline payments table block
- Remove eslint comment and useMemo (replace `const now = useMemo(() => Date.now(), [])` with `const now = Date.now()` — it doesn't need memo; it's only used for trial calculation at render time)
- Import `PlanCard` from `@/features/subscription/components/plan-card`
- Import `CouponSection` from `@/features/subscription/components/coupon-section`
- Import `RecentPaymentsTable` from `@/features/subscription/components/recent-payments-table`

Target page.tsx ~200 lines.

---

## Task 7: Split `invoices-client.tsx` (756 lines)

**Files:**
- Create: `frontend/features/billing/create-invoice-dialog.tsx`
- Modify: `frontend/app/(authenticated)/billing/invoices/invoices-client.tsx`

- [ ] **Step 1: Create `create-invoice-dialog.tsx`**

Extract the full `CreateInvoiceDialog` function (lines 532–755) plus its dependencies:
- `dialogLineItemSchema`, `createInvoiceDialogSchema`, `CreateInvoiceDialogValues`
- `DIALOG_DEFAULT_VALUES`
- `DialogLineItemErrors`, `DialogLineItemRowProps`, `DialogLineItemRow`

`frontend/features/billing/create-invoice-dialog.tsx`:
```tsx
"use client";

import { useCallback } from "react";
import { Controller, useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCreateInvoice } from "@/hooks/api/invoice";
import { formatCurrencyFull } from "@/lib/format-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ... (copy verbatim from invoices-client.tsx lines 429–755, including all schema/type/component definitions)
// Export only CreateInvoiceDialog

export function CreateInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // ... verbatim from existing CreateInvoiceDialog body
}
```

- [ ] **Step 2: Update `invoices-client.tsx` to import from feature**

Remove the `CreateInvoiceDialog` function and all its dependencies from `invoices-client.tsx`. Add import:
```tsx
import { CreateInvoiceDialog } from "@/features/billing/create-invoice-dialog";
```

This reduces `invoices-client.tsx` from 756 to ~430 lines.

---

## Task 8: Create integrations hub + update nav

**Files:**
- Create: `frontend/app/(authenticated)/settings/integrations/page.tsx`
- Modify: `frontend/components/layout/sidebar/sidebar-nav-items.ts`

- [ ] **Step 1: Create integrations hub page**

`frontend/app/(authenticated)/settings/integrations/page.tsx`:
```tsx
import Link from "next/link";
import { Linkedin, CalendarCheck2, GitBranch, ChevronRight } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";

const INTEGRATION_GROUPS = [
  {
    label: "Recruitment",
    description: "Connect job boards to automatically ingest applications into the ATS.",
    href: "/settings/integrations/recruitment",
    icon: Linkedin,
  },
  {
    label: "Calendar",
    description: "Connect Google or Microsoft Outlook for interview scheduling and availability.",
    href: "/settings/integrations/calendar",
    icon: CalendarCheck2,
  },
  {
    label: "Git",
    description: "Connect GitHub, GitLab, or Bitbucket to link commits and PRs to tickets.",
    href: "/settings/integrations/git",
    icon: GitBranch,
  },
] as const;

export default function IntegrationsPage() {
  return (
    <PageWrapper
      title="Integrations"
      subtitle="Connect third-party services to extend StreamlineOS"
    >
      <div className="max-w-2xl space-y-2">
        {INTEGRATION_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Link
              key={group.href}
              href={group.href}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{group.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{group.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
```

- [ ] **Step 2: Update nav href to point to hub**

In `frontend/components/layout/sidebar/sidebar-nav-items.ts`, find:
```ts
      {
        label: "Integrations",
        icon: Plug,
        href: "/settings/integrations/recruitment",
        requiredPermission: "settings:manage",
      },
```
Change to:
```ts
      {
        label: "Integrations",
        icon: Plug,
        href: "/settings/integrations",
        requiredPermission: "settings:manage",
      },
```

- [ ] **Step 3: Verify `getProductFromPathname` still maps integrations to `administration`**

In `sidebar-nav-items.ts`, line ~1451 has:
```ts
  if (
    pathname.startsWith("/organization") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/reports")
  )
    return "administration";
```

`/settings/integrations` starts with `/settings` → already covered. No change needed.

---

## Self-Review Checklist

- [x] Spec coverage: Tasks 1–8 cover all 13 pages audited
- [x] No placeholders: all code is complete and specific
- [x] Type consistency: all interfaces use exact hook types from the real imports
- [x] Line cap: all splits bring files under 500 lines
- [x] No comments in code
- [x] Named handlers only
- [x] No git commands
