"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Shield, Globe, Monitor } from "lucide-react";
import { useOrgSettings, useUpdateOrgSecuritySettings } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

export default function SecurityPage() {
  const { data: org, isLoading, isError, refetch } = useOrgSettings();
  const updateSecurity = useUpdateOrgSecuritySettings();

  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [maxSessions, setMaxSessions] = useState("");
  const [prevOrg, setPrevOrg] = useState(org);

  if (org !== prevOrg) {
    setPrevOrg(org);
    if (org) {
      setMfaEnforced(org.mfaEnforced ?? false);
      setAllowedDomains(org.allowedEmailDomains?.length ? org.allowedEmailDomains.join("\n") : "");
      setMaxSessions(org.maxConcurrentSessions != null ? String(org.maxConcurrentSessions) : "");
    }
  }

  const handleMfaChange = useCallback((checked: boolean) => {
    setMfaEnforced(checked);
  }, []);

  const handleAllowedDomainsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAllowedDomains(e.target.value);
  }, []);

  const handleMaxSessionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxSessions(e.target.value);
  }, []);

  const handleSave = useCallback(() => {
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
      { mfaEnforced, allowedEmailDomains, maxConcurrentSessions },
      {
        onSuccess: () => toast.success("Security policy saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [mfaEnforced, allowedDomains, maxSessions, updateSecurity]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Security Policy"
        subtitle="Configure authentication and access controls for your organisation."
      >
        <div className="space-y-4 pt-2">
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
        <ErrorState
          title="Failed to load security settings"
          description="Could not retrieve your organisation's security policy. Please try again."
          onRetry={refetch}
          className="flex-1"
        />
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

        <div className="flex justify-end">
          <LoadingButton
            onClick={handleSave}
            isPending={updateSecurity.isPending}
            loadingText="Saving…"
          >
            Save Policy
          </LoadingButton>
        </div>
      </div>
    </PageWrapper>
  );
}
