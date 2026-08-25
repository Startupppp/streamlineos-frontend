"use client";

import { Lock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useAutonomySwitches, useSetAutonomySwitch } from "@/hooks/api/crm/autonomy";
import { KIND_LABELS, type EffectiveSwitch } from "@/types/crm/autonomy";

/** A platform veto is not ours to lift, and the UI must not pretend otherwise. */
function vetoedByPlatform(effective: EffectiveSwitch): boolean {
  return effective.decidedBy === "platform-all" || effective.decidedBy === "platform-kind";
}

/**
 * What the system is allowed to do without asking.
 *
 * Adoption is meant to be gradual, so each action type is its own switch rather
 * than one master toggle — an organisation that trusts the system to file mail
 * and draft tasks need not also trust it to move deals.
 */
export function AutonomySwitchesPanel() {
  const canManage = useCan("crm:autonomy:manage");
  const { data, isLoading, isError } = useAutonomySwitches();
  const setSwitch = useSetAutonomySwitch();

  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>What the system may do on its own</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-gap-field">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>What the system may do on its own</CardTitle>
        <CardDescription>
          Turning one off stops it immediately — there is no deploy and no delay. Anything already
          recorded stays in the review feed.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-gap-field">
        {isError || !data ? (
          /*
            An empty switches panel reads as "nothing is switched on", which
            would be a dangerous thing to believe about a product that acts on
            its own. Failing to read the switches is not the same as there
            being none.
          */
          <p role="alert" className="text-label text-muted-foreground">
            These controls could not be loaded, so what the system is currently
            allowed to do is unknown here. Reload to try again.
          </p>
        ) : null}

        {data?.effective.map((effective) => {
          const platformVeto = vetoedByPlatform(effective);
          const busy = setSwitch.isPending && setSwitch.variables?.kind === effective.kind;

          return (
            <div
              key={effective.kind}
              className="flex flex-wrap items-center justify-between gap-gap-field border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <Label htmlFor={`switch-${effective.kind}`} className="text-sm">
                  {KIND_LABELS[effective.kind]}
                </Label>
                {platformVeto ? (
                  <p className="flex items-center gap-1 text-micro text-muted-foreground">
                    <Lock className="size-3" />
                    {/* Say who stopped it. "Why has automation stopped" must have
                        an answer the tenant can reach without asking support. */}
                    Turned off for everyone by StreamlineOS
                    {effective.reason ? ` — ${effective.reason}` : ""}
                  </p>
                ) : effective.reason ? (
                  <p className="text-micro text-muted-foreground">{effective.reason}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                <Switch
                  id={`switch-${effective.kind}`}
                  checked={effective.allowed}
                  /* A platform veto cannot be lifted from here, so the control is
                     disabled rather than showing a toggle that silently fails. */
                  disabled={!canManage || platformVeto || busy}
                  onCheckedChange={(enabled) =>
                    setSwitch.mutate({ kind: effective.kind, enabled })
                  }
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
