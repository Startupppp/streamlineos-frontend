"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Laptop, Smartphone, Monitor, Keyboard, Pencil, Eye, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getColorSafe, deviceStatusColors } from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import type { Device } from "@/types/hr";

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Laptop,
  Phone: Smartphone,
  Monitor,
  Keyboard,
};

const deviceStatusConfig: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
  LOST: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  RETURNED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  IN_REPAIR: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  RETIRED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
};

interface DeviceTableRowProps {
  device: Device;
  onView: (id: number) => void;
  onEdit: (device: Device) => void;
  onDelete: (id: number) => void;
  onStatusChange: (deviceId: number, value: string) => void;
}

export function DeviceTableRow({
  device,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: DeviceTableRowProps) {
  const Icon = DEVICE_ICONS[device.deviceType] ?? Laptop;

  const handleView = useCallback(() => onView(device.id), [device.id, onView]);
  const handleEdit = useCallback(() => onEdit(device), [device, onEdit]);
  const handleDelete = useCallback(() => onDelete(device.id), [device.id, onDelete]);
  const handleStatusChange = useCallback(
    (value: string) => onStatusChange(device.id, value),
    [device.id, onStatusChange],
  );

  const currentStatus = device.status ?? "ACTIVE";
  const statusClass =
    deviceStatusConfig[currentStatus] ??
    getColorSafe(deviceStatusColors, currentStatus);

  const userInitials = device.user
    ? `${device.user.firstName?.[0] ?? ""}${device.user.lastName?.[0] ?? ""}`.toUpperCase()
    : null;

  return (
    <TableRow className="hover:bg-muted/30 transition-colors duration-200">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{device.deviceName}</p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {device.brand} {device.model}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {device.user ? (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-primary">{userInitials}</span>
            </div>
            <span className="text-sm text-foreground">
              {device.user.firstName} {device.user.lastName}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="font-mono text-xs tabular-nums text-foreground/80">
          {device.serialNumber || "—"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-foreground/80">
          {device.assignedDate ? format(new Date(device.assignedDate), "MMM d, yyyy") : "—"}
        </span>
      </TableCell>
      <TableCell>
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger
            className="w-[130px] h-8 border-transparent bg-transparent hover:bg-muted/40 focus:ring-1 transition-colors duration-200"
            aria-label={`Change status for ${device.deviceName}`}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                statusClass,
              )}
            >
              {currentStatus}
            </span>
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted/60 transition-colors duration-200"
            onClick={handleView}
            aria-label={`View ${device.deviceName}`}
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted/60 transition-colors duration-200"
            onClick={handleEdit}
            aria-label={`Edit ${device.deviceName}`}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors duration-200"
            onClick={handleDelete}
            aria-label={`Remove ${device.deviceName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
