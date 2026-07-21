"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useUserDevices, useRemoveDevice } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
  const { data: devices, isLoading, error, refetch } = useUserDevices(userId);
  const { mutate: removeDevice, isPending } = useRemoveDevice();

  function handleRemove(deviceId: string) {
    removeDevice(
      { userId, deviceId },
      {
        onSuccess: () => toast.success("Device removed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        compact
        className="flex-1 w-full min-h-0"
        illustrationPreset="alert"
        title="Couldn't load devices"
        description={getErrorMessage(error)}
        action={{ label: "Retry", onClick: handleRetry }}
      />
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <EmptyState
        compact
        className="flex-1 w-full min-h-0"
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
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={12}
            iconClassName="mr-1 text-red-600 dark:text-red-400"
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 [&_svg]:text-red-600 dark:[&_svg]:text-red-400"
            onClick={() => handleRemove(row.id)}
            disabled={isPending}
          >
            Remove
          </AnimatedIconButton>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={devices}
      columns={columns}
      getRowKey={(device) => device.id}
      className="min-h-0 flex-1"
    />
  );
}
