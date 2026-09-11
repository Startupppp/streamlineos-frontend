"use client";

import { Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRepairPolicies, useSetRepairPolicy } from "@/hooks/api/crm/autonomy";

/**
 * Which broken values the system may quietly fix.
 *
 * This screen existed on the server and nowhere else: the four repair endpoints
 * had no caller in this app at all, so a tenant could neither grant a class nor
 * take one back, and the two classes that are on by default were on with nothing
 * in the product that said so. That mattered more once the repair loop went onto
 * a schedule — a loop running unattended needs the screen that governs it.
 *
 * Each class is its own switch rather than one toggle. They are not equally
 * safe: removing a dot from the edge of a domain names the same mailbox, while
 * deleting whitespace from an address could undo a dot somebody meant to type,
 * which is why that one is off unless a tenant asks for it.
 */
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

  /**
   * The kill switch vetoes every class at once. Said once at the top rather than
   * folded into each row, because rendering three granted classes as "off" would
   * make the setting a tenant just changed look broken.
   */
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
          /*
            An empty list reads as "nothing is granted", which is the wrong thing
            to believe about a product that edits customer data. Failing to read
            the policies is not the same as there being none.
          */
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
                  /* Say that nobody chose this. A class that is on because it
                     shipped on is a different fact from one a tenant granted. */
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
