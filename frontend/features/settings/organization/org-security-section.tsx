"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Network, X, Users } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";

function RemoveDomainBadge({ domain, onRemove }: { domain: string; onRemove: (d: string) => void }) {
  function handleClick() {
    onRemove(domain);
  }
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      @{domain}
      <button type="button" onClick={handleClick} className="ml-0.5 rounded-full hover:bg-muted p-0.5" aria-label={`Remove ${domain}`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function RemoveIpBadge({ ip, onRemove }: { ip: string; onRemove: (ip: string) => void }) {
  function handleClick() {
    onRemove(ip);
  }
  return (
    <Badge variant="secondary" className="gap-1 pr-1 font-mono text-xs">
      {ip}
      <button type="button" onClick={handleClick} className="ml-0.5 rounded-full hover:bg-muted p-0.5" aria-label={`Remove ${ip}`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

interface OrgSecuritySectionProps {
  mfaEnforced: boolean;
  maxConcurrentSessions: string;
  allowedEmailDomains: string[];
  domainInput: string;
  domainInputRef: React.RefObject<HTMLInputElement | null>;
  ipAllowlist: string[];
  ipInput: string;
  isUpdatingSecurity: boolean;
  isUpdatingOrg: boolean;
  onMfaChange: (checked: boolean) => void;
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
  maxConcurrentSessions,
  allowedEmailDomains,
  domainInput,
  domainInputRef,
  ipAllowlist,
  ipInput,
  isUpdatingSecurity,
  isUpdatingOrg,
  onMfaChange,
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
            Configure authentication and access controls for your organization.
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
                <RemoveDomainBadge key={domain} domain={domain} onRemove={onRemoveDomain} />
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
              <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" type="button" variant="outline" size="sm" onClick={onAddDomain}>
                Add
              </AnimatedIconButton>
            </div>
          </div>

          <div className="pt-1">
            <LoadingButton onClick={onSaveSecurity} isPending={isUpdatingSecurity} size="sm" loadingText="Saving…">
              Save Security Settings
            </LoadingButton>
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
              <RemoveIpBadge key={ip} ip={ip} onRemove={onRemoveIp} />
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
            <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" type="button" variant="outline" size="sm" onClick={onAddIp}>
              Add
            </AnimatedIconButton>
          </div>
          <div className="pt-1">
            <LoadingButton onClick={onSaveIpAllowlist} isPending={isUpdatingOrg} size="sm" loadingText="Saving…">
              Save IP Allowlist
            </LoadingButton>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
