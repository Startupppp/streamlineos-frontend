"use client";

import { Laptop, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDevices, useTrustDevice, useRemoveDevice } from "@/lib/api/hooks/auth";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Device = NonNullable<ReturnType<typeof useDevices>["data"]>[number];

function DevicesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] gap-3 text-muted-foreground">
      <Laptop className="h-10 w-10 opacity-30" />
      <p className="text-sm">No devices found</p>
    </div>
  );
}

function DeviceRow({
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
  function handleTrust() {
    onTrust(device.id);
  }

  function handleRemove() {
    onRemove(device.id);
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{device.browser ?? "Unknown"}</TableCell>
      <TableCell className="text-muted-foreground">{device.os ?? "—"}</TableCell>
      <TableCell>
        {device.trusted ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200/60">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Trusted
          </Badge>
        ) : (
          <Badge variant="outline">Untrusted</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(device.lastSeenAt), "MMM d, yyyy HH:mm")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {!device.trusted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrust}
              disabled={isTrustPending}
            >
              Trust
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isRemovePending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
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

  return (
    <PageWrapper
      title="Trusted Devices"
      subtitle="Devices that have been used to sign in to your account."
    >
      {isLoading ? (
        <DevicesSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load devices"
          description="Something went wrong while fetching your trusted devices."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : !devices || devices.length === 0 ? (
        <EmptyState />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Browser</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <DeviceRow
                key={d.id}
                device={d}
                onTrust={handleTrust}
                onRemove={handleRemove}
                isTrustPending={trustDevice.isPending}
                isRemovePending={removeDevice.isPending}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </PageWrapper>
  );
}
