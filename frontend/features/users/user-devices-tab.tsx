"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserDevices, useRemoveDevice } from "@/lib/api/hooks/users";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Laptop, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserDevicesTabProps {
  userId: string;
}

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
        illustration={<Laptop className="h-10 w-10 text-muted-foreground/40" />}
        title="No devices"
        description="This user has no registered devices."
      />
    );
  }

  return (
    <div className="pt-1 rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-xs">Browser</TableHead>
            <TableHead className="text-xs">OS</TableHead>
            <TableHead className="text-xs">Platform</TableHead>
            <TableHead className="text-xs">Last Seen</TableHead>
            <TableHead className="text-xs">Trusted</TableHead>
            <TableHead className="text-xs w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id} className="text-xs">
              <TableCell className="font-medium">{device.browser ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{device.os ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{device.platform ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {device.trusted ? (
                  <Badge variant="outline" className="text-[10px] border-green-200 text-green-600 bg-green-50">
                    Trusted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Unverified
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemove(device.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
