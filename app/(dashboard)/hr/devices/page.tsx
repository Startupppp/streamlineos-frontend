"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Laptop, Smartphone, Monitor, Keyboard, Loader2, Trash2, Pencil, Eye, Download } from "lucide-react";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";

const deviceSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  deviceType: z.string().min(1, "Device type is required"),
  deviceName: z.string().min(1, "Device name is required"),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional(),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

const deviceIcons: Record<string, React.ElementType> = {
  Laptop: Laptop,
  Phone: Smartphone,
  Monitor: Monitor,
  Keyboard: Keyboard,
};

import { getColorSafe, deviceStatusColors, isDeviceStatus } from "@/lib/theme-constants";

export default function DevicesPage() {
  const [open, setOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<{
    id: number; userId: string; deviceType: string; deviceName: string;
    serialNumber?: string | null; brand?: string | null; model?: string | null; notes?: string | null;
  } | null>(null);
  const [viewDevice, setViewDevice] = useState<number | null>(null);
  const [deleteDeviceId, setDeleteDeviceId] = useState<number | null>(null);

  const { data: devices, isLoading } = useHrDevices({});
  const { data: employeesRaw } = useHrEmployees(undefined);
  const employees = (employeesRaw ?? []) as Employee[];

  const createDeviceMutation = useCreateDevice();
  const updateDeviceMutation = useUpdateDevice();
  const deleteDeviceMutation = useDeleteDevice();

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      userId: "",
      deviceType: "",
      deviceName: "",
      serialNumber: "",
      brand: "",
      model: "",
      notes: "",
    },
  });

  const editForm = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
  });

  const handleEdit = (device: typeof editDevice) => {
    if (!device) return;
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
  };

  const onSubmit = (values: DeviceFormValues) => {
    createDeviceMutation.mutate(
      { ...values, assignedDate: new Date() },
      {
        onSuccess: () => {
          toast.success("Device added successfully");
          setOpen(false);
          form.reset();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const onEditSubmit = (values: DeviceFormValues) => {
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
        onSuccess: () => {
          toast.success("Device updated");
          setEditDevice(null);
          editForm.reset();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleStatusChange = (deviceId: number, value: string) => {
    if (!isDeviceStatus(value)) return;
    updateDeviceMutation.mutate({
      deviceId,
      status: value,
      ...(value === "RETURNED" ? { returnDate: new Date() } : {}),
    });
  };

  const handleConfirmDelete = () => {
    if (deleteDeviceId === null) return;
    deleteDeviceMutation.mutate(
      { deviceId: deleteDeviceId },
      {
        onSuccess: () => {
          toast.success("Device removed");
          setDeleteDeviceId(null);
        },
        onError: (error) => toast.error(error.message),
      }
    );
    setDeleteDeviceId(null);
  };

  const handleExport = async () => {
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
  };

  if (isLoading) {
    return (
      <PageWrapper title="Device Management" subtitle="Track devices assigned to employees">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

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
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button aria-label="Add new device">
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
              <SheetHeader className="mb-6">
                <SheetTitle>Add New Device</SheetTitle>
              </SheetHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Employee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Laptop">Laptop</SelectItem>
                              <SelectItem value="Phone">Phone</SelectItem>
                              <SelectItem value="Monitor">Monitor</SelectItem>
                              <SelectItem value="Keyboard">Keyboard</SelectItem>
                              <SelectItem value="Mouse">Mouse</SelectItem>
                              <SelectItem value="Headset">Headset</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deviceName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Name</FormLabel>
                          <FormControl>
                            <Input placeholder="MacBook Pro 14" className="capitalize" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Apple" className="capitalize" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="M3 Pro" className="capitalize" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SN123456789"
                            className="uppercase"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any additional notes..." className="capitalize" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full mt-2" disabled={createDeviceMutation.isPending}>
                    {createDeviceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Device
                  </Button>
                </form>
              </Form>
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
                  {devices.map((device) => {
                    const Icon = deviceIcons[device.deviceType] || Laptop;
                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{device.deviceName}</p>
                              <p className="text-xs text-muted-foreground">
                                {device.brand} {device.model}
                              </p>
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
                          <Select
                            value={device.status || "ACTIVE"}
                            onValueChange={(val) => handleStatusChange(device.id, val)}
                          >
                            <SelectTrigger className="w-[120px]" aria-label={`Change status for ${device.deviceName}`}>
                              <Badge variant="outline" className={getColorSafe(deviceStatusColors, device.status ?? "ACTIVE")}>
                                {device.status || "ACTIVE"}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
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
                              onClick={() => setViewDevice(device.id)}
                              aria-label={`View ${device.deviceName}`}
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit({
                                id: device.id,
                                userId: device.userId,
                                deviceType: device.deviceType,
                                deviceName: device.deviceName,
                                serialNumber: device.serialNumber,
                                brand: device.brand,
                                model: device.model,
                                notes: device.notes,
                              })}
                              aria-label={`Edit ${device.deviceName}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteDeviceId(device.id)}
                              aria-label={`Remove ${device.deviceName}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {/* View Device Sheet */}
      <Sheet open={viewDevice !== null} onOpenChange={(o) => { if (!o) setViewDevice(null); }}>
        <SheetContent className="sm:max-w-md p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Device Details</SheetTitle>
          </SheetHeader>
          {(() => {
            const d = devices?.find((dev) => dev.id === viewDevice);
            if (!d) return <p className="text-sm text-muted-foreground">Device not found</p>;
            const Icon = deviceIcons[d.deviceType] || Laptop;
            const rows = [
              { label: "Device Name", value: d.deviceName },
              { label: "Type", value: d.deviceType },
              { label: "Brand", value: d.brand || "—" },
              { label: "Model", value: d.model || "—" },
              { label: "Serial Number", value: d.serialNumber || "—" },
              { label: "Assigned To", value: d.user ? `${d.user.firstName} ${d.user.lastName}` : "—" },
              { label: "Assigned Date", value: d.assignedDate ? format(new Date(d.assignedDate), "MMM d, yyyy") : "—" },
              { label: "Status", value: d.status || "ACTIVE" },
              { label: "Notes", value: d.notes || "—" },
            ];
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="h-12 w-12 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{d.deviceName}</p>
                    <p className="text-sm text-muted-foreground">{d.brand} {d.model}</p>
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
          })()}
        </SheetContent>
      </Sheet>

      {/* Edit Device Sheet */}
      <Sheet open={editDevice !== null} onOpenChange={(o) => { if (!o) setEditDevice(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>Edit Device</SheetTitle>
          </SheetHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
              <FormField
                control={editForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Employee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Laptop">Laptop</SelectItem>
                          <SelectItem value="Phone">Phone</SelectItem>
                          <SelectItem value="Monitor">Monitor</SelectItem>
                          <SelectItem value="Keyboard">Keyboard</SelectItem>
                          <SelectItem value="Mouse">Mouse</SelectItem>
                          <SelectItem value="Headset">Headset</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="deviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Name</FormLabel>
                      <FormControl><Input placeholder="MacBook Pro 14" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl><Input placeholder="Apple" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl><Input placeholder="M3 Pro" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="SN123456789" className="uppercase"
                        {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea placeholder="Any additional notes..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-2" disabled={updateDeviceMutation.isPending}>
                {updateDeviceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDeviceId !== null} onOpenChange={(open) => { if (!open) setDeleteDeviceId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this device? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
