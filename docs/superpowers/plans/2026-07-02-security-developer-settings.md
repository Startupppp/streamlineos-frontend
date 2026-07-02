# Security + Developer Settings Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all pages in the Security and Developer admin groups — correct endpoints, add missing org-level policy UI, add missing filters, clean up dead code, and ensure functional/responsive/conformant UX.

**Architecture:** Five pages in `app/(authenticated)/settings/**` each edited independently. All hooks for sessions/password-change already point at the correct backend endpoints (`/hr/sessions`, `/me/change-password`, `/me/api-tokens`, `/api-tokens`, `/audit-log`, `/organization/security`, `/webhooks`). No deleted endpoints remain. The `useUpdateOrgSecuritySettings` hook in `hooks/api/organization.ts` wraps `PATCH /organization/security` (accepts `mfaEnforced`, `passwordExpiryDays`). `useOrgSettings` fetches current org data (including those fields). Webhook test-delivery does NOT exist in backend — do not add a fake button.

**Tech Stack:** Next.js App Router, TypeScript strict, TanStack Query v5, react-hook-form + Zod, shadcn/ui, Sonner, Tailwind CSS.

---

## Audit Findings

### Page 1: `/settings/security` (Password Policy)
- **BUG**: Shows personal password-change form. The Security admin group should show org-level password policy.
- **FIX**: Rewrite to use `useOrgSettings` (read) + `useUpdateOrgSecuritySettings` (save) for MFA enforcement + password expiry.
- **Files**: `app/(authenticated)/settings/security/page.tsx`

### Page 2: `/settings/sessions` (Session Management)
- **BUG**: Imports `useSessions/useRevokeSession/useRevokeAllSessions` from `@/hooks/api/auth` — different query key (`queryKeys.auth.sessions()`) than `hr/sessions.ts` (`queryKeys.sessions.list()`). Cache inconsistency: revoking on this admin page doesn't invalidate the personal account-settings sessions list.
- **BUG**: Uses `session.id === currentSessionId` (from `useSession`) to flag current session; `hr/sessions.ts`'s `UserSession` type already has `isCurrent: boolean` which the backend returns — use that instead.
- **MINOR**: Local `EmptyState` function duplicates `@/components/ui/empty-state`.
- **MINOR**: Table needs `overflow-x-auto` wrapper for mobile.
- **Files**: `app/(authenticated)/settings/sessions/page.tsx`

### Page 3: `/settings/audit-log` (Audit Log)
- **MISSING**: Task requires action/type/date/**user** filters. Currently has action/type/date only.
- **FIX**: Add client-side user search (filter displayed rows by `log.userName` or `log.userEmail`). Backend filter interface doesn't include userId so client-side is honest.
- **Files**: `app/(authenticated)/settings/audit-log/page.tsx`

### Page 4: `/settings/webhooks` (Webhooks)
- **BUG**: Subtitle says "in the CRM" — webhooks cover the whole platform.
- **MISSING**: No error state when the list fetch fails (only loading + empty handled).
- **MISSING**: No `staleTime` on `useWebhooks` query.
- **MISSING**: No `mutationKey` on mutations.
- **NOTE**: Webhook test-delivery endpoint does NOT exist in backend — skip.
- **Files**: `app/(authenticated)/settings/webhooks/page.tsx`

### Page 5: `/settings/api-tokens` (API Tokens)
- **BUG**: PersonalTokensTab revoke uses `Trash2` (delete icon) — semantically wrong. Revoke = `ShieldOff`. Confirmed org tab uses ShieldOff correctly.
- **BUG**: `onClick={() => setRevoking(t)}` and `onClick={() => setDeleting(t)}` in OrgTokensTab table rows are anonymous → must be named handlers.
- **Files**: `app/(authenticated)/settings/api-tokens/page.tsx`

---

## Task 1: `/settings/security` — Org Password Policy

**Files:**
- Rewrite: `frontend/app/(authenticated)/settings/security/page.tsx`

- [ ] Read the current file (already done in discovery)

- [ ] Write the new page:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { useOrgSettings, useUpdateOrgSecuritySettings } from "@/hooks/api/organization";
import { getApiError } from "@/lib/api-client";

export default function PasswordPolicyPage() {
  const { data: org, isLoading, isError, refetch } = useOrgSettings();
  const update = useUpdateOrgSecuritySettings();

  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [expiryDays, setExpiryDays] = useState("");

  useEffect(() => {
    if (!org) return;
    setMfaEnforced(org.mfaEnforced ?? false);
    setExpiryDays(org.passwordExpiryDays != null ? String(org.passwordExpiryDays) : "");
  }, [org]);

  const handleSave = useCallback(() => {
    const parsedDays = expiryDays.trim() === "" ? null : parseInt(expiryDays, 10);
    if (expiryDays.trim() !== "" && (isNaN(parsedDays!) || parsedDays! < 30 || parsedDays! > 365)) {
      toast.error("Password expiry must be between 30 and 365 days, or left blank to disable.");
      return;
    }
    update.mutate(
      { mfaEnforced, passwordExpiryDays: parsedDays },
      {
        onSuccess: () => toast.success("Security policy saved"),
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }, [mfaEnforced, expiryDays, update]);

  const handleMfaChange = useCallback((checked: boolean) => setMfaEnforced(checked), []);
  const handleExpiryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setExpiryDays(e.target.value), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <PageWrapper
      title="Password Policy"
      subtitle="Configure organization-wide authentication and password security settings."
    >
      <div className="max-w-lg">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[160px] w-full rounded-lg" />
            <Skeleton className="h-[120px] w-full rounded-lg" />
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load security settings"
            description="Failed to fetch your organization's security configuration."
            onRetry={handleRetry}
          />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Authentication Policy</CardTitle>
              </div>
              <CardDescription>
                These settings apply to all members of your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Require MFA for all members</Label>
                  <p className="text-xs text-muted-foreground">
                    Members without MFA will be redirected to set it up on next login.
                  </p>
                </div>
                <Switch
                  checked={mfaEnforced}
                  onCheckedChange={handleMfaChange}
                  aria-label="Require MFA for all members"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="expiry-days" className="text-sm font-medium">
                    Password expires every N days
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to disable expiry. Allowed range: 30–365 days.
                </p>
                <Input
                  id="expiry-days"
                  type="number"
                  min={30}
                  max={365}
                  placeholder="e.g. 90"
                  value={expiryDays}
                  onChange={handleExpiryChange}
                  className="w-36"
                />
              </div>

              <div className="pt-1">
                <Button onClick={handleSave} disabled={update.isPending} size="sm">
                  {update.isPending ? "Saving…" : "Save Policy"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
```

---

## Task 2: `/settings/sessions` — Session Management

**Files:**
- Rewrite: `frontend/app/(authenticated)/settings/sessions/page.tsx`

- [ ] Write the fixed page (import from hr/sessions, use isCurrent, use EmptyState component, overflow-x wrapper):

Key changes vs current:
1. `import { useSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/api/hr/sessions"` (instead of auth)
2. Use `session.isCurrent` instead of `session.id === currentSessionId` (remove useSession)
3. Replace local `EmptyState` with `EmptyState` from `@/components/ui/empty-state`
4. Wrap table in `<div className="overflow-x-auto">`

---

## Task 3: `/settings/audit-log` — Audit Log

**Files:**
- Modify: `frontend/app/(authenticated)/settings/audit-log/page.tsx`

Key changes:
1. Add `userSearch` state variable (`useState("")`)
2. Add user search Input to the filter bar (5th filter)
3. Filter `logs` to `filteredLogs = logs.filter(log => !userSearch || ...)` before rendering
4. Use `filteredLogs` in table body (not `logs`)
5. Update `handleUserSearchChange` handler (named, not anonymous)

---

## Task 4: `/settings/webhooks` — Webhooks

**Files:**
- Modify: `frontend/app/(authenticated)/settings/webhooks/page.tsx`

Key changes:
1. Fix subtitle: "Send real-time events to external systems" (remove "in the CRM")
2. Add `isError` + retry from `useWebhooks` destructuring
3. Add `ErrorState` import and render when `isError`
4. Add `staleTime: 60_000` to `useWebhooks`
5. Add `mutationKey` to create/toggle/delete mutations

---

## Task 5: `/settings/api-tokens` — API Tokens

**Files:**
- Modify: `frontend/app/(authenticated)/settings/api-tokens/page.tsx`

Key changes:
1. In `PersonalTokensTab`: change revoke button from `Trash2` to `ShieldOff` icon
2. Extract named handler functions in OrgTokensTab table rows (no anonymous onClick arrows)
3. In PersonalTokensTab table rows: same named-handler fix

---

## Self-Review Checklist

- [ ] Spec coverage: password policy page ✓, sessions ✓, audit log user filter ✓, webhooks fix ✓, api-tokens fix ✓
- [ ] No placeholders
- [ ] No anonymous handlers
- [ ] No `any` types
- [ ] No comments in code
- [ ] All imports from correct hook files
- [ ] Backend endpoints verified: `/organization/security` (patch), `/hr/sessions` (get/delete), `/audit-log` (get), `/webhooks` (get/post/patch/delete), `/api-tokens` (get/post/patch/delete), `/me/api-tokens` (get/post/delete)
