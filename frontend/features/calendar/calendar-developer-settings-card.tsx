"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Copy, ExternalLink, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCalendarDeveloperCredentials, useCreateCalendarDeveloperCredential, useRevokeCalendarDeveloperCredential } from "@/hooks/api/calendar-developer";
import { calendarApiScopes, type CalendarApiScope } from "@/hooks/api/calendar-developer-schema";

const scopeLabels: Record<CalendarApiScope, string> = {
  "calendar:availability:read": "Read availability",
  "calendar:bookings:read": "Read bookings",
  "calendar:bookings:write": "Create bookings",
  "calendar:lifecycle:write": "Change lifecycle",
  "calendar:embeds:read": "Read embed policy",
};

function defaultExpiry(): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 30);
  return value.toISOString().slice(0, 10);
}

export function CalendarDeveloperSettingsCard() {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursorHistory.at(-1);
  const credentials = useCalendarDeveloperCredentials(cursor);
  const create = useCreateCalendarDeveloperCredential();
  const revoke = useRevokeCalendarDeveloperCredential();
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [scopes, setScopes] = useState<CalendarApiScope[]>(["calendar:availability:read"]);
  const [secret, setSecret] = useState<string | null>(null);

  function toggleScope(scope: CalendarApiScope, checked: boolean) {
    setScopes((current) => checked
      ? current.includes(scope) ? current : [...current, scope]
      : current.filter((value) => value !== scope));
  }

  async function createCredential() {
    if (!name.trim() || scopes.length === 0) {
      toast.error("Enter a name and select at least one scope");
      return;
    }
    try {
      const result = await create.mutateAsync({
        name: name.trim(),
        description: null,
        scopes,
        expiresAt: new Date(`${expiresAt}T23:59:59.000Z`).toISOString(),
      });
      setSecret(result.token);
      setName("");
      toast.success("Calendar API credential created");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function revokeCredential(id: string) {
    try {
      await revoke.mutateAsync(id);
      toast.success("Credential revoked");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    toast.success("Credential copied");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Developer API</CardTitle><CardDescription>Create short-lived, least privilege credentials for the versioned Calendar API.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {secret ? <Alert><KeyRound /><AlertTitle>Copy this credential now</AlertTitle><AlertDescription><div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center"><code className="min-w-0 flex-1 break-all rounded bg-muted p-2 text-xs">{secret}</code><Button variant="outline" size="sm" onClick={() => void copySecret()}><Copy className="size-3.5" />Copy</Button><Button variant="ghost" size="sm" onClick={() => setSecret(null)}>Done</Button></div><p className="mt-2">It will not be shown again.</p></AlertDescription></Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="calendar-api-name">Credential name</Label><Input id="calendar-api-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Scheduling integration" /></div><div className="space-y-1.5"><Label htmlFor="calendar-api-expiry">Expires</Label><Input id="calendar-api-expiry" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></div></div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Scopes</legend><div className="grid gap-2 sm:grid-cols-2">{calendarApiScopes.map((scope) => <Label key={scope} className="flex items-center gap-2 rounded-md border px-3 py-2 font-normal"><Checkbox checked={scopes.includes(scope)} onCheckedChange={(value) => toggleScope(scope, value === true)} />{scopeLabels[scope]}</Label>)}</div></fieldset>
        <div className="flex flex-wrap justify-between gap-2"><Button variant="outline" asChild><Link href="/settings/webhooks">Manage signed webhooks<ExternalLink className="size-3.5" /></Link></Button><LoadingButton isPending={create.isPending} onClick={() => void createCredential()}>Create credential</LoadingButton></div>
        {credentials.isError ? <Alert variant="destructive"><AlertTitle>Credentials unavailable</AlertTitle><AlertDescription><div className="flex flex-wrap items-center justify-between gap-2"><span>{getErrorMessage(credentials.error)}</span><Button variant="outline" size="sm" onClick={() => void credentials.refetch()}>Retry</Button></div></AlertDescription></Alert> : null}
        <div className="divide-y rounded-lg border">
          {(credentials.data?.data ?? []).map((credential) => <div key={credential.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{credential.name}</p>{credential.isRevoked ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="outline">Active</Badge>}</div><p className="text-xs text-muted-foreground">{credential.keyPrefix}… · {credential.scopes.map((scope) => scopeLabels[scope]).join(", ")} · expires {new Date(credential.expiresAt).toLocaleDateString()}</p></div>{!credential.isRevoked ? <LoadingButton variant="outline" size="sm" isPending={revoke.isPending && revoke.variables === credential.id} onClick={() => void revokeCredential(credential.id)}>Revoke</LoadingButton> : null}</div>)}
          {!credentials.isLoading && (credentials.data?.data.length ?? 0) === 0 ? <p className="p-4 text-sm text-muted-foreground">No Calendar API credentials.</p> : null}
        </div>
        {cursorHistory.length > 1 || credentials.data?.pagination.hasMore ? <div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={cursorHistory.length === 1 || credentials.isFetching} onClick={() => setCursorHistory((current) => current.slice(0, -1))}>Previous</Button><Button variant="outline" size="sm" disabled={!credentials.data?.pagination.nextCursor || credentials.isFetching} onClick={() => { const next = credentials.data?.pagination.nextCursor; if (next) setCursorHistory((current) => [...current, next]); }}>Next</Button></div> : null}
      </CardContent>
    </Card>
  );
}
