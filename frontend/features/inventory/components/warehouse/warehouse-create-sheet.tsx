"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateWarehouse } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { createWarehouseSchema, type CreateWarehouseValues } from "./warehouse-schema";

interface WarehouseCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarehouseCreateSheet({ open, onOpenChange }: WarehouseCreateSheetProps) {
  const createMutation = useCreateWarehouse();

  const form = useForm<CreateWarehouseValues>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "",
      isActive: true,
    },
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        form.reset();
      }
      onOpenChange(nextOpen);
    },
    [form, onOpenChange],
  );

  function handleCancel(): void {
    handleOpenChange(false);
  }

  const onSubmit = useCallback(
    (values: CreateWarehouseValues) => {
      const code = values.code.toUpperCase();
      createMutation.mutate(
        {
          name: values.name,
          code,
          address: values.address || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          country: values.country || undefined,
          isActive: values.isActive,
        },
        {
          onSuccess: () => {
            toast.success("Warehouse created");
            handleOpenChange(false);
          },
          onError: (err: unknown) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, handleOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-md w-full flex flex-col gap-0 p-0"
      >
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>New Warehouse</SheetTitle>
          <SheetDescription>
            Add a new storage facility to your organization.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Main Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Code <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="WH-001"
                        className="font-mono uppercase"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Storage Lane" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="Maharashtra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <FormLabel className="text-label font-medium">
                          Active
                        </FormLabel>
                        <p className="text-dense text-muted-foreground">
                          Allow stock operations in this warehouse
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="shrink-0 px-6 py-4 border-t">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={createMutation.isPending}
                  loadingText="Creating…"
                >
                  Create Warehouse
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
