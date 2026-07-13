"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Shield, Clock, Globe, Monitor } from "lucide-react";
import { useOrgSettings, useUpdateOrgSecuritySettings } from "@/hooks/api/organization";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

export default function SecurityPage() {
  const { data: org, isLoading, isError, refetch } = useOrgSettings();
  const updateSecurity = useUpdateOrgSecuritySettings();

  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [expiryDays, setExpiryDays] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [maxSessions, setMaxSessions] = useState("");
  const [prevOrg, setPrevOrg] = useState(org);

  if (org !== prevOrg) {
    setPrevOrg(org);
    if (org) {
      setMfaEnforced(org.mfaEnforced ?? false);
      setExpiryDays(org.passwordExpiryDays != null ? String(org.passwordExpiryDays) : "");
      setAllowedDomains(org.allowedEmailDomains?.length ? org.allowedEmailDomains.join("\n") : "");
      setMaxSessions(org.maxConcurrentSessions != null ? String(org.maxConcurrentSessions) : "");
    }
  }

  const handleMfaChange = useCallback((checked: boolean) => {
    setMfaEnforced(checked);
  }, []);

  const handleExpiryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDays(e.target.value);
  }, []);

  const handleAllowedDomainsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAllowedDomains(e.target.value);
  }, []);

  const handleMaxSessionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxSessions(e.target.value);
  }, []);

  const handleSave = useCallback(() => {
    let passwordExpiryDays: number | null = null;
    if (expiryDays.trim() !== "") {
      const parsed = parseInt(expiryDays, 10);
      if (isNaN(parsed) || parsed < 30 || parsed > 365) {
        toast.error("Password expiry must be between 30 and 365 days");
        return;
      }
      passwordExpiryDays = parsed;
    }

    let maxConcurrentSessions: number | null = null;
    if (maxSessions.trim() !== "") {
      const parsed = parseInt(maxSessions, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 100) {
        toast.error("Max concurrent sessions must be between 1 and 100");
        return;
      }
      maxConcurrentSessions = parsed;
    }

    const allowedEmailDomains = allowedDomains
      .split(/[\n,]+/)
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    updateSecurity.mutate(
      { mfaEnforced, passwordExpiryDays, allowedEmailDomains, maxConcurrentSessions },
      {
        onSuccess: () => toast.success("Security policy saved"),
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }, [expiryDays, mfaEnforced, allowedDomains, maxSessions, updateSecurity]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Security Policy"
        subtitle="Configure authentication and access controls for your organisation."
      >
        <div className="space-y-4 pt-2">
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Security Policy"
        subtitle="Configure authentication and access controls for your organisation."
      >
        <div className="pt-2">
          <ErrorState
            title="Failed to load security settings"
            description="Could not retrieve your organisation's security policy. Please try again."
            onRetry={refetch}
          />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Security Policy"
      subtitle="Configure authentication and access controls for your organisation."
    >
      <div className="space-y-4 pt-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Multi-Factor Authentication</CardTitle>
            </div>
            <CardDescription>
              When enabled, all members must enrol in a TOTP authenticator app before they can sign in. Takes effect at the next sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="mfa-enforced" className="text-sm font-medium">
                Require MFA for all members
              </Label>
              <Switch
                id="mfa-enforced"
                checked={mfaEnforced}
                onCheckedChange={handleMfaChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Password Expiry</CardTitle>
            </div>
            <CardDescription>
              Require a password change every N days. Enforced at the next sign-in once the period has elapsed. Leave blank to never expire. Per NIST 800-63B, periodic rotation is only recommended for specific compliance requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
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
              <Label htmlFor="expiry-days" className="text-sm text-muted-foreground">
                days (30–365, blank to disable)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Allowed Email Domains</CardTitle>
            </div>
            <CardDescription>
              When set, invitations can only be sent to email addresses in these domains. Enforced at invite time. Leave blank to allow any domain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="allowed-domains"
              placeholder={"example.com\nacme.org"}
              value={allowedDomains}
              onChange={handleAllowedDomainsChange}
              className="min-h-[80px] text-sm font-mono"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">One domain per line, or comma-separated.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Max Concurrent Sessions</CardTitle>
            </div>
            <CardDescription>
              Limit the number of active sessions per member. When a new sign-in exceeds the limit, the oldest sessions are revoked automatically. Leave blank for no limit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                id="max-sessions"
                type="number"
                min={1}
                max={100}
                placeholder="e.g. 3"
                value={maxSessions}
                onChange={handleMaxSessionsChange}
                className="w-36"
              />
              <Label htmlFor="max-sessions" className="text-sm text-muted-foreground">
                sessions (1–100, blank for no limit)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSecurity.isPending}>
            {updateSecurity.isPending ? "Saving…" : "Save Policy"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
