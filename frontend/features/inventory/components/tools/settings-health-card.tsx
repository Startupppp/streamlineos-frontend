"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettingsHealth, useExpireStaleReservations } from "@/hooks/api/inventory/admin";

export function SettingsHealthCard() {
  const { data: health, isLoading } = useSettingsHealth();
  const expireMutation = useExpireStaleReservations();
  const [alertOpen, setAlertOpen] = React.useState(false);

  async function handleExpire() {
    try {
      await expireMutation.mutateAsync();
      toast.success("Stale reservations have been expired.");
    } catch {
      toast.error("Failed to expire stale reservations.");
    } finally {
      setAlertOpen(false);
    }
  }

  function handleExpireClick() {
    setAlertOpen(true);
  }

  function handleAlertCancel() {
    setAlertOpen(false);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Maintenance &amp; Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map(function renderSkeleton(_, i) {
                return <Skeleton key={i} className="h-12 w-full" />;
              })}
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Reconciliation Sample</p>
                <p className="text-sm font-medium truncate">
                  {health.reconciliationSampleResult ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Expired Reservations</p>
                <p className="text-sm font-medium">{health.expiredReservationsCount}</p>
                {health.expiredReservationsCount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    These reservations have passed their expiry
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Failed Jobs</p>
                <p className={`text-sm font-medium ${health.failedJobsCount > 0 ? "text-red-600" : ""}`}>
                  {health.failedJobsCount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Failed Webhooks</p>
                <p className={`text-sm font-medium ${health.failedWebhooksCount > 0 ? "text-red-600" : ""}`}>
                  {health.failedWebhooksCount}
                </p>
              </div>
            </div>
          ) : null}

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpireClick}
              disabled={expireMutation.isPending}
              className="gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Expire Stale Reservations
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expire Stale Reservations</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all overdue reservations as EXPIRED. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAlertCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExpire} disabled={expireMutation.isPending}>
              {expireMutation.isPending ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
