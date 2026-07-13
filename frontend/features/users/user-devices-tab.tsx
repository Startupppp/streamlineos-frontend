"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useUserDevices, useRemoveDevice } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserDevicesTabProps {
  userId: string;
}

type Device = {
  id: string;
  browser: string | null;
  os: string | null;
  platform: string | null;
  lastSeenAt: string;
  trusted: boolean;
};

export function UserDevicesTab({ userId }: UserDevicesTabProps) {
  const { data: devices, isLoading } = useUserDevices(userId);
  const { mutate: removeDevice, isPending } = useRemoveDevice();

  function handleRemove(deviceId: string) {
    removeDevice(
      { userId, deviceId },
      {
        onSuccess: () => toast.success("Device removed"),
        onError: (e) => toast.error(getApiError(e)),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <EmptyState
        compact
        illustrationPreset="devices"
        title="No devices"
        description="This user has no registered devices."
      />
    );
  }

  const columns: DataTableColumn<Device>[] = [
    {
      key: "browser",
      header: "Browser",
      cell: (row) => <span className="font-medium">{row.browser ?? "—"}</span>,
    },
    {
      key: "os",
      header: "OS",
      cell: (row) => <span className="text-muted-foreground">{row.os ?? "—"}</span>,
    },
    {
      key: "platform",
      header: "Platform",
      cell: (row) => <span className="text-muted-foreground">{row.platform ?? "—"}</span>,
    },
    {
      key: "lastSeen",
      header: "Last Seen",
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(row.lastSeenAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "trusted",
      header: "Trusted",
      cell: (row) =>
        row.trusted ? (
          <Badge variant="outline" className="text-[10px] border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10">
            Trusted
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Unverified
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-20",
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleRemove(row.id)}
            disabled={isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="pt-1">
      <DataTable
        data={devices}
        columns={columns}
        getRowKey={(device) => device.id}
      />
    </div>
  );
}
