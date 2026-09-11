"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Activity, Clock, Webhook, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
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

  const failedJobs = health ? health.failedImportJobs + health.failedExportJobs : 0;

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
            <StatCardGrid cols={2}>
              <StatCard
                label="Reconciliation Status"
                value={health.ledgerReconciliation.status}
                icon={Activity}
                tone="blue"
              />
              <StatCard
                label="Expired Reservations"
                value={health.activeExpiredReservations}
                icon={Clock}
                tone="amber"
                hint={
                  health.activeExpiredReservations > 0
                    ? "These reservations have passed their expiry"
                    : undefined
                }
              />
              <StatCard
                label="Failed Jobs"
                value={failedJobs}
                icon={Server}
                tone={failedJobs > 0 ? "red" : "default"}
              />
              <StatCard
                label="Failed Webhooks"
                value={health.failedWebhookEvents}
                icon={Webhook}
                tone={health.failedWebhookEvents > 0 ? "red" : "default"}
              />
            </StatCardGrid>
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
