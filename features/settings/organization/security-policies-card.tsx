"use client";

import { useState, useCallback, useRef, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Clock, Globe, X, Plus } from "lucide-react";
import { useUpdateOrgSecuritySettings } from "@/lib/api/hooks/organization";
import { toast } from "sonner";
import type { OrgSettings } from "@/types/organization";


interface DomainBadgeItemProps {
  domain: string;
  onRemove: (domain: string) => void;
}

const DomainBadgeItem = memo(function DomainBadgeItem({ domain, onRemove }: DomainBadgeItemProps) {
  const handleRemove = useCallback(() => onRemove(domain), [onRemove, domain]);
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      @{domain}
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
        aria-label={`Remove ${domain}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
});


interface SecurityPoliciesCardProps {
  org: OrgSettings;
}

export function SecurityPoliciesCard({ org }: SecurityPoliciesCardProps) {
  const [initialized, setInitialized] = useState(false);
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<string>("");
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const domainInputRef = useRef<HTMLInputElement>(null);

  const { mutate: updateSecurity, isPending: isUpdating } = useUpdateOrgSecuritySettings();

  if (!initialized && org) {
    setMfaEnforced(org.mfaEnforced ?? false);
    setPasswordExpiryDays(String(org.passwordExpiryDays ?? ""));
    setAllowedEmailDomains(org.allowedEmailDomains ?? []);
    setInitialized(true);
  }

  const handlePasswordExpiryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPasswordExpiryDays(e.target.value),
    []
  );

  const handleDomainInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDomainInput(e.target.value),
    []
  );

  const handleAddDomain = useCallback(() => {
    const domain = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!domain || allowedEmailDomains.includes(domain)) return;
    setAllowedEmailDomains((prev) => [...prev, domain]);
    setDomainInput("");
    domainInputRef.current?.focus();
  }, [domainInput, allowedEmailDomains]);

  const handleRemoveDomain = useCallback((domain: string) => {
    setAllowedEmailDomains((prev) => prev.filter((d) => d !== domain));
  }, []);

  const handleDomainKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddDomain();
      }
    },
    [handleAddDomain]
  );

  const handleSave = useCallback(() => {
    const expiryDaysNum = passwordExpiryDays ? parseInt(passwordExpiryDays, 10) : null;
    if (passwordExpiryDays && (isNaN(expiryDaysNum!) || expiryDaysNum! < 30 || expiryDaysNum! > 365)) {
      toast.error("Password expiry must be between 30 and 365 days");
      return;
    }
    updateSecurity(
      { mfaEnforced, passwordExpiryDays: expiryDaysNum, allowedEmailDomains },
      {
        onSuccess: () => toast.success("Security settings saved"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save security settings"),
      }
    );
  }, [mfaEnforced, passwordExpiryDays, allowedEmailDomains, updateSecurity]);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          Security Policies
        </CardTitle>
        <CardDescription>
          Configure authentication and password policies for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Require MFA for all members</Label>
            <p className="text-sm text-muted-foreground">
              Members without MFA enabled will be redirected to set it up on their next login.
            </p>
          </div>
          <Switch
            checked={mfaEnforced}
            onCheckedChange={setMfaEnforced}
            aria-label="Require MFA for all members"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="password-expiry" className="text-sm font-medium">
              Password expires every N days
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Leave empty to disable password expiry. Allowed range: 30–365 days.
          </p>
          <Input
            id="password-expiry"
            type="number"
            min={30}
            max={365}
            placeholder="e.g. 90"
            value={passwordExpiryDays}
            onChange={handlePasswordExpiryChange}
            className="w-40"
            aria-label="Password expiry days"
          />
        </div>

        <Separator />

        {/* Email Domain Restriction */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Allowed Email Domains</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Restrict invitations to specific email domains (e.g. <code>company.com</code>). Leave empty to allow any domain.
          </p>
          <div className="flex flex-wrap gap-2 min-h-8">
            {allowedEmailDomains.map((domain) => (
              <DomainBadgeItem key={domain} domain={domain} onRemove={handleRemoveDomain} />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              ref={domainInputRef}
              placeholder="e.g. company.com"
              value={domainInput}
              onChange={handleDomainInputChange}
              onKeyDown={handleDomainKeyDown}
              className="w-full max-w-sm"
              aria-label="Email domain to add"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddDomain}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div className="pt-1">
          <Button onClick={handleSave} disabled={isUpdating} size="sm">
            {isUpdating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Security Settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
