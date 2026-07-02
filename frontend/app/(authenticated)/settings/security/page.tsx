"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Shield, Clock } from "lucide-react";
import { useOrgSettings, useUpdateOrgSecuritySettings } from "@/hooks/api/organization";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";

export default function SecurityPage() {
  const { data: org, isLoading, isError, refetch } = useOrgSettings();
  const updateSecurity = useUpdateOrgSecuritySettings();

  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [expiryDays, setExpiryDays] = useState("");

  useEffect(() => {
    if (!org) return;
    setMfaEnforced(org.mfaEnforced ?? false);
    setExpiryDays(org.passwordExpiryDays != null ? String(org.passwordExpiryDays) : "");
  }, [org]);

  const handleMfaChange = useCallback((checked: boolean) => {
    setMfaEnforced(checked);
  }, []);

  const handleExpiryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDays(e.target.value);
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

    updateSecurity.mutate(
      { mfaEnforced, passwordExpiryDays },
      {
        onSuccess: () => toast.success("Security policy saved"),
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }, [expiryDays, mfaEnforced, updateSecurity]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Password Policy"
        subtitle="Configure organisation-level security and authentication requirements."
      >
        <div className="max-w-xl space-y-4 pt-2">
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Password Policy"
        subtitle="Configure organisation-level security and authentication requirements."
      >
        <div className="max-w-xl pt-2">
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
      title="Password Policy"
      subtitle="Configure organisation-level security and authentication requirements."
    >
      <div className="max-w-xl space-y-4 pt-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Multi-Factor Authentication</CardTitle>
            </div>
            <CardDescription>
              Require all members of this organisation to enrol in MFA before accessing the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="mfa-enforced" className="text-sm font-medium">
                Enforce MFA for all members
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
              Force members to reset their password after a set number of days. Leave blank to disable expiry.
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
                days (30–365)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateSecurity.isPending}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            {updateSecurity.isPending ? "Saving…" : "Save Policy"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
