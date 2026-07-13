"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Clock, Globe, Network, X, Plus, Users } from "lucide-react";

interface OrgSecuritySectionProps {
  mfaEnforced: boolean;
  passwordExpiryDays: string;
  maxConcurrentSessions: string;
  allowedEmailDomains: string[];
  domainInput: string;
  domainInputRef: React.RefObject<HTMLInputElement | null>;
  ipAllowlist: string[];
  ipInput: string;
  isUpdatingSecurity: boolean;
  isUpdatingOrg: boolean;
  onMfaChange: (checked: boolean) => void;
  onPasswordExpiryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMaxConcurrentSessionsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDomainInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDomainInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddDomain: () => void;
  onRemoveDomain: (domain: string) => void;
  onSaveSecurity: () => void;
  onIpInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onIpInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddIp: () => void;
  onRemoveIp: (ip: string) => void;
  onSaveIpAllowlist: () => void;
}

export function OrgSecuritySection({
  mfaEnforced,
  passwordExpiryDays,
  maxConcurrentSessions,
  allowedEmailDomains,
  domainInput,
  domainInputRef,
  ipAllowlist,
  ipInput,
  isUpdatingSecurity,
  isUpdatingOrg,
  onMfaChange,
  onPasswordExpiryChange,
  onMaxConcurrentSessionsChange,
  onDomainInputChange,
  onDomainInputKeyDown,
  onAddDomain,
  onRemoveDomain,
  onSaveSecurity,
  onIpInputChange,
  onIpInputKeyDown,
  onAddIp,
  onRemoveIp,
  onSaveIpAllowlist,
}: OrgSecuritySectionProps) {
  return (
    <>
      <Card className="rounded-lg border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
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
              onCheckedChange={onMfaChange}
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
              onChange={onPasswordExpiryChange}
              className="w-40"
              aria-label="Password expiry days"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="max-sessions" className="text-sm font-medium">
                Maximum concurrent sessions per user
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Leave empty to allow unlimited sessions. Older sessions are revoked when the limit is exceeded.
            </p>
            <Input
              id="max-sessions"
              type="number"
              min={1}
              max={100}
              placeholder="e.g. 3"
              value={maxConcurrentSessions}
              onChange={onMaxConcurrentSessionsChange}
              className="w-40"
              aria-label="Maximum concurrent sessions"
            />
          </div>

          <Separator />

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
                <Badge key={domain} variant="secondary" className="gap-1 pr-1">
                  @{domain}
                  <button
                    type="button"
                    onClick={() => onRemoveDomain(domain)}
                    className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                    aria-label={`Remove ${domain}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                ref={domainInputRef}
                placeholder="e.g. company.com"
                value={domainInput}
                onChange={onDomainInputChange}
                onKeyDown={onDomainInputKeyDown}
                className="w-full max-w-sm"
                aria-label="Email domain to add"
              />
              <Button type="button" variant="outline" size="sm" onClick={onAddDomain}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <div className="pt-1">
            <Button onClick={onSaveSecurity} disabled={isUpdatingSecurity} size="sm">
              {isUpdatingSecurity ? (
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

      <Card className="rounded-lg border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            IP Allowlist
          </CardTitle>
          <CardDescription>
            Restrict dashboard access to specific IP addresses or prefixes. Leave empty to allow access from any IP.
            Add exact IPs (e.g. <code>203.0.113.5</code>) or prefixes (e.g. <code>192.168.1.</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 min-h-8">
            {ipAllowlist.map((ip) => (
              <Badge key={ip} variant="secondary" className="gap-1 pr-1 font-mono text-xs">
                {ip}
                <button
                  type="button"
                  onClick={() => onRemoveIp(ip)}
                  className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                  aria-label={`Remove ${ip}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {ipAllowlist.length === 0 && (
              <span className="text-xs text-muted-foreground">No IP restrictions — all IPs allowed.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 203.0.113.5 or 192.168.1."
              value={ipInput}
              onChange={onIpInputChange}
              onKeyDown={onIpInputKeyDown}
              className="w-full max-w-sm font-mono text-sm"
              aria-label="IP address or prefix to add"
            />
            <Button type="button" variant="outline" size="sm" onClick={onAddIp}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          <div className="pt-1">
            <Button onClick={onSaveIpAllowlist} disabled={isUpdatingOrg} size="sm">
              {isUpdatingOrg ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save IP Allowlist"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
