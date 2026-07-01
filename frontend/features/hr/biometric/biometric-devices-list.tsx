"use client";

import { motion } from "framer-motion";
import { Fingerprint, Wifi, WifiOff, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBiometricDevices } from "@/hooks/api/hr/biometric";
import { format } from "date-fns";

interface Props {
  canManage: boolean;
}

export function BiometricDevicesList({ canManage }: Props) {
  const { data: devices, isLoading } = useBiometricDevices();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!devices?.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-64 gap-3 text-center">
        <Fingerprint className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No biometric devices</p>
        <p className="text-xs text-muted-foreground/70">Add your fingerprint or face-recognition devices to start syncing attendance</p>
      </div>
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
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{device.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[11px]">{device.vendor}</Badge>
                <span className="flex items-center gap-1 text-[11px]">
                  {device.isOnline ? (
                    <Wifi className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={device.isOnline ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                    {device.isOnline ? "Online" : "Offline"}
                  </span>
                </span>
              </div>
            </div>
            {canManage && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
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
                <span className="font-medium text-foreground truncate max-w-[120px]">{device.location}</span>
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
