"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateTimeDevice, useUpdateTimeDevice, type TimeDevice } from "@/hooks/api/hr/enterprise-comp";

const schema = z.object({
  name: z.string().min(1, "Required"),
  serialNumber: z.string().min(1, "Required"),
  type: z.enum(["biometric", "rfid", "mobile", "other"]),
  status: z.enum(["active", "inactive", "faulty"]).optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  device?: TimeDevice | null;
}

export function DeviceSheet({ open, onOpenChange, device }: Props) {
  const createMut = useCreateTimeDevice();
  const updateMut = useUpdateTimeDevice();
  const isEdit = !!device;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", serialNumber: "", type: "biometric" },
  });

  useEffect(() => {
    if (device) {
      form.reset({ name: device.name, serialNumber: device.serialNumber, type: device.type, status: device.status });
    } else {
      form.reset({ name: "", serialNumber: "", type: "biometric" });
    }
  }, [device, form]);

  function onSubmit(values: FormValues) {
    if (isEdit && device) {
      updateMut.mutate(
        { id: device.id, ...values },
        {
          onSuccess: () => { toast.success("Device updated"); onOpenChange(false); },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      createMut.mutate(
        { name: values.name, serialNumber: values.serialNumber, type: values.type },
        {
          onSuccess: () => { toast.success("Device added"); onOpenChange(false); },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEdit ? "Edit Device" : "Add Time Clock Device"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-4 flex-1">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Name</FormLabel>
                  <FormControl><Input placeholder="Main Entrance Biometric" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="serialNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl><Input placeholder="ZK-00123456" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="biometric">Biometric</SelectItem>
                      <SelectItem value="rfid">RFID</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {isEdit && (
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="faulty">Faulty</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            <SheetFooter className="px-6 py-4 border-t">
              <LoadingButton type="submit" isPending={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
                {isEdit ? "Save Changes" : "Add Device"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
