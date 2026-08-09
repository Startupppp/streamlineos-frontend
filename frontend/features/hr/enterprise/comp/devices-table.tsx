"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Edit2, AlertCircle, CheckCircle2, WifiOff } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useTimeDevices, useDeleteTimeDevice, type TimeDevice } from "@/hooks/api/hr/enterprise-comp";

interface Props {
  canManage: boolean;
  onAdd: () => void;
  onEdit: (device: TimeDevice) => void;
}

const STATUS_ICON = {
  active: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  inactive: <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />,
  faulty: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  faulty: "destructive",
};

export function DevicesTable({ canManage, onAdd, onEdit }: Props) {
  const { data, isLoading } = useTimeDevices();
  const deleteMut = useDeleteTimeDevice();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleDelete(device: TimeDevice) {
    setDeletingId(device.id);
    deleteMut.mutate(device.id, {
      onSuccess: () => { toast.success("Device removed"); setDeletingId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeletingId(null); },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  const devices = data?.data ?? [];

  if (!devices.length) {
    return (
      <EmptyState
        illustrationPreset="devices"
        title="No time clock devices"
        description="Register biometric, RFID, or mobile devices to start tracking clock-ins"
        action={canManage ? { label: "Add Device", onClick: onAdd } : undefined}
        className={CONTENT_FILL_PANEL}
        compact
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-1 min-h-0 flex-col">
      <DataTable
        className="flex-1 min-h-0"
        getRowKey={(r) => r.id}
        columns={[
          { key: "name", header: "Device Name", cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "serial", header: "Serial", cell: (r) => <span className="font-mono text-xs">{r.serialNumber}</span> },
          { key: "type", header: "Type", cell: (r) => <Badge variant="secondary" className="capitalize">{r.type}</Badge> },
          {
            key: "status",
            header: "Status",
            cell: (r) => (
              <div className="flex items-center gap-1.5">
                {STATUS_ICON[r.status]}
                <Badge variant={STATUS_VARIANT[r.status]} className="capitalize text-[11px]">{r.status}</Badge>
              </div>
            ),
          },
          { key: "lastSync", header: "Last Sync", cell: (r) => r.lastSyncAt ? format(new Date(r.lastSyncAt), "dd MMM HH:mm") : <span className="text-muted-foreground text-xs">Never</span> },
          {
            key: "actions",
            header: "",
            cell: (r) => canManage ? (
              <div className="flex items-center gap-1 justify-end">
                <Button variant="ghost" size="icon" className="w-7" aria-label={`Edit ${r.name}`} onClick={(e) => { e.stopPropagation(); onEdit(r); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <LoadingButton
                  variant="ghost"
                  size="icon"
                  className="w-7 text-red-500 hover:text-red-600"
                  aria-label={`Delete ${r.name}`}
                  isPending={deletingId === r.id}
                  onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                >
                  <Trash2Icon size={14} />
                </LoadingButton>
              </div>
            ) : null,
          },
        ]}
        data={devices}
      />
    </motion.div>
  );
}
