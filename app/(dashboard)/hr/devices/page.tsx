"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useHrDevices,
  useHrEmployees,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
} from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import DevicesLoading from "./loading";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Laptop, Smartphone, Monitor, Keyboard, Download } from "lucide-react";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { isDeviceStatus } from "@/lib/theme-constants";
import type { Device, Employee } from "@/types/hr";
import {
  DeviceFormContent, deviceSchema, type DeviceFormValues,
} from "@/features/hr/devices/device-form-content";
import { DeviceTableRow } from "@/features/hr/devices/device-table-row";

const DEVICE_ICONS: Record<string, React.ElementType> = {
  Laptop, Phone: Smartphone, Monitor, Keyboard,
};

export default function DevicesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [viewDeviceId, setViewDeviceId] = useState<number | null>(null);
  const [deleteDeviceId, setDeleteDeviceId] = useState<number | null>(null);

  const { data: devices, isLoading } = useHrDevices({});
  const { data: employeesRaw } = useHrEmployees(undefined);
  const employees = (employeesRaw ?? []) as Employee[];

  const createDeviceMutation = useCreateDevice();
  const updateDeviceMutation = useUpdateDevice();
  const deleteDeviceMutation = useDeleteDevice();

  const addForm = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: { userId: "", deviceType: "", deviceName: "", serialNumber: "", brand: "", model: "", notes: "" },
  });

  const editForm = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
  });

  const handleAddDevice = useCallback((values: DeviceFormValues) => {
    createDeviceMutation.mutate(
      { ...values, assignedDate: new Date() },
      {
        onSuccess: () => { toast.success("Device added successfully"); setAddOpen(false); addForm.reset(); },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [createDeviceMutation, addForm]);

  const handleEditDevice = useCallback((device: Device) => {
    setEditDevice(device);
    editForm.reset({
      userId: device.userId,
      deviceType: device.deviceType,
      deviceName: device.deviceName,
      serialNumber: device.serialNumber || "",
      brand: device.brand || "",
      model: device.model || "",
      notes: device.notes || "",
    });
  }, [editForm]);

  const handleUpdateDevice = useCallback((values: DeviceFormValues) => {
    if (!editDevice) return;
    updateDeviceMutation.mutate(
      {
        deviceId: editDevice.id,
        userId: values.userId,
        deviceType: values.deviceType,
        deviceName: values.deviceName,
        serialNumber: values.serialNumber || undefined,
        brand: values.brand || undefined,
        model: values.model || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => { toast.success("Device updated"); setEditDevice(null); editForm.reset(); },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [editDevice, updateDeviceMutation, editForm]);

  const handleStatusChange = useCallback((deviceId: number, value: string) => {
    if (!isDeviceStatus(value)) return;
    updateDeviceMutation.mutate({
      deviceId,
      status: value,
      ...(value === "RETURNED" ? { returnDate: new Date() } : {}),
    });
  }, [updateDeviceMutation]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteDeviceId === null) return;
    deleteDeviceMutation.mutate(
      { deviceId: deleteDeviceId },
      {
        onSuccess: () => { toast.success("Device removed"); setDeleteDeviceId(null); },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [deleteDeviceId, deleteDeviceMutation]);

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      await downloadXlsx("devices-export.xlsx", [{
        name: "Devices",
        columns: [
          { header: "Device Name", key: "deviceName", width: 20 },
          { header: "Type", key: "deviceType", width: 12 },
          { header: "Brand", key: "brand", width: 12 },
          { header: "Model", key: "model", width: 12 },
          { header: "Serial Number", key: "serialNumber", width: 18 },
          { header: "Assigned To", key: "assignedTo", width: 20 },
          { header: "Assigned Date", key: "assignedDate", width: 14 },
          { header: "Status", key: "status", width: 12 },
        ],
        rows: (devices || []).map(d => ({
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          brand: d.brand || "",
          model: d.model || "",
          serialNumber: d.serialNumber || "",
          assignedTo: d.user ? `${d.user.firstName} ${d.user.lastName}` : "",
          assignedDate: d.assignedDate ? format(new Date(d.assignedDate), "yyyy-MM-dd") : "",
          status: d.status || "ACTIVE",
        })),
      }]);
      toast.success("Devices exported");
    } catch {
      toast.error("Export failed");
    }
  }, [devices]);

  const handleCloseEditSheet = useCallback((open: boolean) => {
    if (!open) setEditDevice(null);
  }, []);

  const handleCloseViewSheet = useCallback((open: boolean) => {
    if (!open) setViewDeviceId(null);
  }, []);

  const handleCloseDeleteDialog = useCallback((open: boolean) => {
    if (!open) setDeleteDeviceId(null);
  }, []);

  if (isLoading) {
    return <DevicesLoading />;
  }

  const viewedDevice = devices?.find(d => d.id === viewDeviceId);

  return (
    <PageWrapper
      title="Device Management"
      subtitle="Track devices assigned to employees"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!devices?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Sheet open={addOpen} onOpenChange={setAddOpen}>
            <SheetTrigger asChild>
              <Button aria-label="Add new device">
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col p-0 sm:max-w-lg">
              <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <SheetTitle>Add New Device</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <DeviceFormContent
                  form={addForm}
                  employees={employees}
                  isPending={createDeviceMutation.isPending}
                  submitLabel="Add Device"
                  onSubmit={handleAddDevice}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Devices ({devices?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent aria-live="polite">
            {devices && devices.length > 0 ? (
              <Table>
                <caption className="sr-only">Company devices assigned to employees</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Device</TableHead>
                    <TableHead scope="col">Assigned To</TableHead>
                    <TableHead scope="col">Serial Number</TableHead>
                    <TableHead scope="col">Assigned Date</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <DeviceTableRow
                      key={device.id}
                      device={device}
                      onView={setViewDeviceId}
                      onEdit={handleEditDevice}
                      onDelete={setDeleteDeviceId}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <EmptyDevicesIllustration className="mb-3 mx-auto" />
                <p>No devices assigned yet</p>
                <p className="text-sm">Click &quot;Add Device&quot; to assign devices to employees</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={viewDeviceId !== null} onOpenChange={handleCloseViewSheet}>
        <SheetContent className="sm:max-w-md p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Device Details</SheetTitle>
          </SheetHeader>
          {viewedDevice ? (() => {
            const Icon = DEVICE_ICONS[viewedDevice.deviceType] ?? Laptop;
            const rows = [
              { label: "Device Name", value: viewedDevice.deviceName },
              { label: "Type", value: viewedDevice.deviceType },
              { label: "Brand", value: viewedDevice.brand || "—" },
              { label: "Model", value: viewedDevice.model || "—" },
              { label: "Serial Number", value: viewedDevice.serialNumber || "—" },
              { label: "Assigned To", value: viewedDevice.user ? `${viewedDevice.user.firstName} ${viewedDevice.user.lastName}` : "—" },
              { label: "Assigned Date", value: viewedDevice.assignedDate ? format(new Date(viewedDevice.assignedDate), "MMM d, yyyy") : "—" },
              { label: "Status", value: viewedDevice.status || "ACTIVE" },
              { label: "Notes", value: viewedDevice.notes || "—" },
            ];
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="h-12 w-12 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{viewedDevice.deviceName}</p>
                    <p className="text-sm text-muted-foreground">{viewedDevice.brand} {viewedDevice.model}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {rows.map((row) => (
                    <div key={row.label} className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-medium text-right max-w-[60%]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <p className="text-sm text-muted-foreground">Device not found</p>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={editDevice !== null} onOpenChange={handleCloseEditSheet}>
        <SheetContent className="flex flex-col p-0 sm:max-w-lg">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>Edit Device</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <DeviceFormContent
              form={editForm}
              employees={employees}
              isPending={updateDeviceMutation.isPending}
              submitLabel="Save Changes"
              onSubmit={handleUpdateDevice}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteDeviceId !== null}
        onOpenChange={handleCloseDeleteDialog}
        title="Remove Device"
        description="Are you sure you want to remove this device? This action cannot be undone."
        confirmLabel="Remove"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
