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
import type { Device } from "@/types/hr";

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Laptop,
  Phone: Smartphone,
  Monitor,
  Keyboard,
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

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{device.deviceName}</p>
            <p className="text-xs text-muted-foreground">{device.brand} {device.model}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {device.user ? (
          <span>{device.user.firstName} {device.user.lastName}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm">{device.serialNumber || "-"}</span>
      </TableCell>
      <TableCell>
        {device.assignedDate ? format(new Date(device.assignedDate), "MMM d, yyyy") : "-"}
      </TableCell>
      <TableCell>
        <Select value={device.status || "ACTIVE"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[120px]" aria-label={`Change status for ${device.deviceName}`}>
            <Badge variant="outline" className={getColorSafe(deviceStatusColors, device.status ?? "ACTIVE")}>
              {device.status || "ACTIVE"}
            </Badge>
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
          <Button variant="ghost" size="icon" onClick={handleView} aria-label={`View ${device.deviceName}`}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleEdit} aria-label={`Edit ${device.deviceName}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
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
