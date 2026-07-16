"use client";

import { ShieldCheck } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDevices, useTrustDevice, useRemoveDevice } from "@/hooks/api/auth";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type Device = NonNullable<ReturnType<typeof useDevices>["data"]>[number];

function DeviceActions({
  device,
  onTrust,
  onRemove,
  isTrustPending,
  isRemovePending,
}: {
  device: Device;
  onTrust: (id: string) => void;
  onRemove: (id: string) => void;
  isTrustPending: boolean;
  isRemovePending: boolean;
}) {
  function handleTrustClick() {
    onTrust(device.id);
  }

  function handleRemoveClick() {
    onRemove(device.id);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        hidden={device.trusted}
        variant="outline"
        size="sm"
        onClick={handleTrustClick}
        disabled={isTrustPending}
      >
        Trust
      </Button>
      <AnimatedIconButton
        icon={Trash2Icon}
        iconSize={16}
        variant="ghost"
        size="sm"
        onClick={handleRemoveClick}
        disabled={isRemovePending}
      />
    </div>
  );
}

export default function DevicesPage() {
  const { data: devices, isLoading, isError, refetch } = useDevices();
  const trustDevice = useTrustDevice();
  const removeDevice = useRemoveDevice();

  function handleTrust(id: string) {
    trustDevice.mutate(id, {
      onSuccess: () => toast.success("Device trusted"),
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  function handleRemove(id: string) {
    removeDevice.mutate(id, {
      onSuccess: () => toast.success("Device removed"),
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<Device>[] = [
    {
      key: "browser",
      header: "Browser",
      cell: (d) => <span className="font-medium">{d.browser ?? "Unknown"}</span>,
    },
    {
      key: "os",
      header: "OS",
      cell: (d) => (
        <span className="text-muted-foreground">{d.os ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (d) =>
        d.trusted ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200/60">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Trusted
          </Badge>
        ) : (
          <Badge variant="outline">Untrusted</Badge>
        ),
    },
    {
      key: "lastSeenAt",
      header: "Last Seen",
      sortable: true,
      sortValue: (d) => new Date(d.lastSeenAt).getTime(),
      cell: (d) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(d.lastSeenAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-24",
      cell: (d) => (
        <DeviceActions
          device={d}
          onTrust={handleTrust}
          onRemove={handleRemove}
          isTrustPending={trustDevice.isPending}
          isRemovePending={removeDevice.isPending}
        />
      ),
    },
  ];

  return (
    <PageWrapper
      title="Trusted Devices"
      subtitle="Devices that have been used to sign in to your account."
    >
      {isError ? (
        <ErrorState
          title="Couldn't load devices"
          description="Something went wrong while fetching your trusted devices."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <DataTable
          data={devices ?? []}
          columns={columns}
          getRowKey={(d) => d.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              illustrationPreset="devices"
              title="No devices found"
              description="No devices have been registered to your account."
            />
          }
          minWidth="500px"
          className="flex-1 min-h-0"
        />
      )}
    </PageWrapper>
  );
}
