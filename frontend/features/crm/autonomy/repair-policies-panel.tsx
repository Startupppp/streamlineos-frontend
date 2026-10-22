"use client";

import { Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRepairPolicies, useSetRepairPolicy } from "@/hooks/api/crm/autonomy";

export function RepairPoliciesPanel() {
  const canRepair = useCan("crm:autonomy:repair");
  const { data, isLoading, isError } = useRepairPolicies();
  const setPolicy = useSetRepairPolicy();

  if (isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fixes the system may make on its own</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-gap-field">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </CardContent>
      </Card>
    );

  const vetoed = data ? !data.autonomy.allowed : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixes the system may make on its own</CardTitle>
        <CardDescription>
          Only changes that leave the value meaning the same thing. Every one is recorded and can
          be taken back individually.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-gap-field">
        {isError || !data ? (
          <p role="alert" className="text-label text-muted-foreground">
            These controls could not be loaded, so what the system is currently allowed to repair
            is unknown here. Reload to try again.
          </p>
        ) : null}

        {vetoed ? (
          <p className="flex items-center gap-1 text-micro text-muted-foreground">
            <Lock className="size-3" />
            Repairs are switched off entirely, so nothing below is running
            {data?.autonomy.reason ? ` — ${data.autonomy.reason}` : ""}.
          </p>
        ) : null}

        {data?.classes.map((policy) => {
          const busy = setPolicy.isPending && setPolicy.variables?.repairClass === policy.repairClass;
          const failed =
            setPolicy.isError && setPolicy.variables?.repairClass === policy.repairClass
              ? getErrorMessage(setPolicy.error)
              : null;

          return (
            <div
              key={policy.repairClass}
              className="flex flex-wrap items-center justify-between gap-gap-field border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <Label htmlFor={`repair-${policy.repairClass}`} className="text-sm">
                  {policy.description}
                </Label>
                {policy.source === "default" ? (
                  <p className="text-micro text-muted-foreground">
                    {policy.enabled
                      ? "On unless you say otherwise."
                      : "Off unless you ask for it."}
                  </p>
                ) : policy.reason ? (
                  <p className="text-micro text-muted-foreground">{policy.reason}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                <Switch
                  id={`repair-${policy.repairClass}`}
                  checked={policy.enabled}
                  disabled={!canRepair || busy}
                  onCheckedChange={(enabled) =>
                    setPolicy.mutate({ repairClass: policy.repairClass, enabled })
                  }
                />
              </div>

              {failed ? (
                <p role="alert" className="w-full text-label text-status-danger-ink">
                  {failed} — this fix is still {policy.enabled ? "allowed" : "not allowed"}.
                </p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
