"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import type { RecruitmentIntegration } from "@/hooks/api/hr/recruitment/integrations";

/**
 * What each blocked code means on screen, and — more importantly — whose
 * problem it is.
 *
 * `not-implemented` is ours. The other three are the organisation's, and are
 * the only ones that get a Connect control, because offering one for a
 * capability that has no adapter behind it sends someone to find a key that
 * would change nothing.
 */
const BLOCKED_LABEL: Record<NonNullable<RecruitmentIntegration["blockedCode"]>, string> = {
  "not-implemented": "Not available",
  "no-integration": "Not connected",
  inactive: "Switched off",
  "needs-keys": "No key saved",
};

const BLOCKED_TONE: Record<NonNullable<RecruitmentIntegration["blockedCode"]>, string> = {
  "not-implemented": "bg-muted text-muted-foreground border-border",
  "no-integration": "bg-muted text-muted-foreground border-border",
  inactive: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  "needs-keys": "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

interface Props {
  integration: RecruitmentIntegration;
  onConnect: (platform: string, token: string) => void;
  onToggleActive: (platform: string, isActive: boolean) => void;
  onDisconnect: (platform: string) => void;
  onRotateSecret: (platform: string) => void;
  isPending: boolean;
}

export function IntegrationCard({
  integration,
  onConnect,
  onToggleActive,
  onDisconnect,
  onRotateSecret,
  isPending,
}: Props) {
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState(false);

  const handleTokenChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value),
    [],
  );
  const handleOpenEditor = useCallback(() => setEditing(true), []);
  const handleCancel = useCallback(() => {
    setEditing(false);
    setToken("");
  }, []);
  const handleSave = useCallback(() => {
    onConnect(integration.platform, token);
    setEditing(false);
    setToken("");
  }, [onConnect, integration.platform, token]);
  const handleToggle = useCallback(
    () => onToggleActive(integration.platform, !integration.isActive),
    [onToggleActive, integration.platform, integration.isActive],
  );
  const handleDisconnect = useCallback(
    () => onDisconnect(integration.platform),
    [onDisconnect, integration.platform],
  );
  const handleRotate = useCallback(
    () => onRotateSecret(integration.platform),
    [onRotateSecret, integration.platform],
  );

  /**
   * Held in a local so the `=== null` checks below narrow it. Read off the prop
   * each time, TypeScript has to assume a mutation between the test and the
   * lookup and the indexed reads stop compiling.
   */
  const blockedCode = integration.blockedCode;
  const available = blockedCode === null;
  const connectable = integration.adapterImplemented;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{integration.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{integration.does}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              blockedCode === null
                ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                : BLOCKED_TONE[blockedCode],
            )}
          >
            {blockedCode === null ? "Connected" : BLOCKED_LABEL[blockedCode]}
          </Badge>
        </div>

        {/*
          Why it cannot be used, in terms of the actual dependency. A partner
          programme and a missing API key are different problems and only one of
          them is the recruiter's to solve.
        */}
        {!connectable && integration.blockedBy && (
          <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
            {integration.blockedBy}
          </p>
        )}

        {/*
          What still works meanwhile. This is what keeps "not available" from
          being a dead end — a recruiter can still do the job by hand, and
          saying so is the difference between a limitation and a wall.
        */}
        {!available && integration.manualFallback && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Meanwhile: </span>
            {integration.manualFallback}
          </p>
        )}

        {connectable && (
          <div className="space-y-2">
            {integration.hasCredentials && !editing && (
              <p className="text-xs text-muted-foreground">
                Key saved ending {integration.credentialHint}
              </p>
            )}

            {editing ? (
              <div className="space-y-1.5">
                <Label htmlFor={`token-${integration.platform}`}>API key</Label>
                <Input
                  id={`token-${integration.platform}`}
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={handleTokenChange}
                  placeholder="Paste the key from the board's developer console"
                />
                <div className="flex gap-2">
                  <LoadingButton size="sm" onClick={handleSave} isPending={isPending} disabled={!token}>
                    Save key
                  </LoadingButton>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleOpenEditor}>
                  {integration.hasCredentials ? "Replace key" : "Connect"}
                </Button>
                {integration.connected && (
                  <Button size="sm" variant="ghost" onClick={handleToggle}>
                    {integration.isActive ? "Switch off" : "Switch on"}
                  </Button>
                )}
                {integration.family === "job-board" && integration.connected && (
                  <Button size="sm" variant="ghost" onClick={handleRotate}>
                    {/* Inbound applications are signed with this; rotating breaks old deliveries. */}
                    Callback secret
                  </Button>
                )}
                {integration.connected && (
                  <Button size="sm" variant="ghost" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
