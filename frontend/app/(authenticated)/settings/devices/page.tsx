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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
      <Laptop className="h-10 w-10 opacity-30" />
      <p className="text-sm">No devices found</p>
    </div>
  );
}

export default function DevicesPage() {
  const { data: devices, isLoading } = useDevices();
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

  return (
    <PageWrapper
      title="Trusted Devices"
      subtitle="Devices that have been used to sign in to your account."
    >
      {isLoading ? (
        <DevicesSkeleton />
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
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.browser ?? "Unknown"}</TableCell>
                <TableCell className="text-muted-foreground">{d.os ?? "—"}</TableCell>
                <TableCell>
                  {d.trusted ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200/60">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Trusted
                    </Badge>
                  ) : (
                    <Badge variant="outline">Untrusted</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(d.lastSeenAt), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {!d.trusted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTrust(d.id)}
                        disabled={trustDevice.isPending}
                      >
                        Trust
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(d.id)}
                      disabled={removeDevice.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageWrapper>
  );
}
