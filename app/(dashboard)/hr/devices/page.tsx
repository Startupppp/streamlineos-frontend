"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { PageHeader } from "@/components/ui/page-header";
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
import { Plus, Laptop, Smartphone, Monitor, Keyboard, Loader2, Trash2 } from "lucide-react";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { format } from "date-fns";

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
  const [deleteDeviceId, setDeleteDeviceId] = useState<number | null>(null);

  const { data: devices, isLoading, refetch } = api.hr.getDevices.useQuery({});
  const { data: employees } = api.hr.getEmployees.useQuery();

  const createDeviceMutation = api.hr.createDevice.useMutation({
    onSuccess: () => {
      toast.success("Device added successfully");
      setOpen(false);
      form.reset();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateDeviceMutation = api.hr.updateDevice.useMutation({
    onSuccess: () => {
      toast.success("Device updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteDeviceMutation = api.hr.deleteDevice.useMutation({
    onSuccess: () => {
      toast.success("Device removed");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const onSubmit = (values: DeviceFormValues) => {
    createDeviceMutation.mutate({
      ...values,
      assignedDate: new Date(),
    });
  };

  const handleStatusChange = (deviceId: number, value: string) => {
    if (!isDeviceStatus(value)) return;
    updateDeviceMutation.mutate({
      deviceId,
      status: value,
      ...(value === "RETURNED" ? { returnDate: new Date() } : {}),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Device Management"
        description="Track devices assigned to employees"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            {employees?.map((emp) => (
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
                            <Input placeholder="MacBook Pro 14" {...field} />
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
                            <Input placeholder="Apple" {...field} />
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
                            <Input placeholder="M3 Pro" {...field} />
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
                          <Input placeholder="SN123456789" {...field} />
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
                          <Textarea placeholder="Any additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={createDeviceMutation.isPending}>
                    {createDeviceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Device
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

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
                  <TableHead>Device</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                          <SelectTrigger className="w-[120px]">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteDeviceId(device.id)}
                          aria-label={`Remove ${device.deviceName}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
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

      {/* Delete Confirmation Dialog */}
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
              onClick={() => {
                if (deleteDeviceId !== null) {
                  deleteDeviceMutation.mutate({ deviceId: deleteDeviceId });
                  setDeleteDeviceId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

