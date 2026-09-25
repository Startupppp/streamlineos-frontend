"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Edit2 } from "lucide-react";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBiometricDevices, type BiometricDevice } from "@/hooks/api/hr/biometric";
import { format } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  canManage: boolean;
  onEdit: (device: BiometricDevice) => void;
}

export function BiometricDevicesList({ canManage, onEdit }: Props) {
  const { data: devices, isLoading, isError, error, refetch } = useBiometricDevices();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // hr:attendance:manage gates this read and the route has no server guard: a denied
  // caller read "No biometric devices" (FE-47).
  const pageState = usePageState({ permission: "hr:attendance:manage", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageState
        resolution={pageState}
        className="flex-1"
        onRetry={handleRetry}
        loading={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        }
      >
        {null}
      </PageState>
    );
  }

  if (!devices?.length) {
    return (
      <EmptyState
        illustrationPreset="devices"
        title="No biometric devices"
        description="Add your fingerprint or face-recognition devices to start syncing attendance"
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {devices.map((device, idx) => (
        <motion.div
          key={device.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.05 }}
          className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <TruncatedText text={device.name} className="text-sm font-semibold text-foreground" />
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-dense">{device.vendor}</Badge>
                <span className="flex items-center gap-1 text-dense">
                  {device.isOnline ? (
                    <Wifi className="h-3 w-3 text-status-success-ink" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={device.isOnline ? "text-status-success-ink font-medium" : "text-muted-foreground"}>
                    {device.isOnline ? "Online" : "Offline"}
                  </span>
                </span>
              </div>
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onEdit(device)}
                aria-label={`Edit ${device.name}`}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>IP Address</span>
              <span className="font-mono font-medium text-foreground">{device.ipAddress}:{device.port}</span>
            </div>
            {device.location && (
              <div className="flex items-center justify-between">
                <span>Location</span>
                <TruncatedText text={device.location} className="font-medium text-foreground max-w-[120px]" />
              </div>
            )}
            {device.lastSyncAt && (
              <div className="flex items-center justify-between">
                <span>Last sync</span>
                <span className="font-medium text-foreground">{format(new Date(device.lastSyncAt), "dd MMM, HH:mm")}</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
