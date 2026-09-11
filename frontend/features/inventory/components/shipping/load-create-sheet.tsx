"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
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
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCreateLoad } from "@/hooks/api/inventory/shipping-loads";
import { useShipments } from "@/hooks/api/inventory/shipping";
import { useCarriers } from "@/hooks/api/inventory/shipping-carriers";
import { useTransfers } from "@/hooks/api/inventory/transfers";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { SHIPMENT_STATUS_LABEL, TRANSFER_STATUS_LABEL } from "@/features/inventory/lib";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  LOAD_CREATE_DEFAULTS,
  loadCreateSchema,
  toCreateLoadInput,
  type LoadCreateValues,
} from "./load-create-schema";
import { LoadDocumentPicker, type LoadDocumentOption } from "./load-document-picker";

const NO_SELECTION = "none";
const DOCUMENT_LIMIT = 100;

interface LoadCreateSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LoadCreateSheet({ open, onOpenChange }: LoadCreateSheetProps) {
  const createMutation = useCreateLoad();
  const warehousesQuery = useWarehouses();
  const carriersQuery = useCarriers();
  const shipmentsQuery = useShipments({ limit: DOCUMENT_LIMIT });
  const transfersQuery = useTransfers({ limit: DOCUMENT_LIMIT });

  const form = useForm<LoadCreateValues>({
    resolver: zodResolver(loadCreateSchema),
    defaultValues: LOAD_CREATE_DEFAULTS,
  });

  const shipmentOptions: LoadDocumentOption[] = (shipmentsQuery.data?.items ?? []).map(
    (shipment) => ({
      id: shipment.id,
      label: shipment.shipmentNumber,
      sublabel: shipment.trackingNumber
        ? `${SHIPMENT_STATUS_LABEL[shipment.status]} · ${shipment.trackingNumber}`
        : SHIPMENT_STATUS_LABEL[shipment.status],
    }),
  );

  const transferOptions: LoadDocumentOption[] = (transfersQuery.data?.items ?? []).map(
    (transfer) => ({
      id: transfer.id,
      label: transfer.referenceNumber,
      sublabel: `${TRANSFER_STATUS_LABEL[transfer.status]} · ${transfer.fromLocationName ?? "—"} → ${transfer.toLocationName ?? "—"}`,
    }),
  );

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset(LOAD_CREATE_DEFAULTS);
    onOpenChange(nextOpen);
  }

  function handleClose(): void {
    form.reset(LOAD_CREATE_DEFAULTS);
    onOpenChange(false);
  }

  function handleSubmit(values: LoadCreateValues): void {
    createMutation.mutate(toCreateLoadInput(values), {
      onSuccess: () => {
        toast.success("Load created");
        handleClose();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="New Load"
      description="Group shipments or transfers into a single transport load."
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="load-create-form"
            size="sm"
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            Create Load
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="load-create-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Pune hub" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. MH12 AB 1234" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sourceWarehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source warehouse</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="No source warehouse" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value={NO_SELECTION}>No source warehouse</SelectItem>
                    {(warehousesQuery.data ?? []).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="carrierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carrier</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="No carrier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value={NO_SELECTION}>No carrier</SelectItem>
                    {(carriersQuery.data ?? []).map((carrier) => (
                      <SelectItem key={carrier.id} value={String(carrier.id)}>
                        {carrier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shipmentIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipments</FormLabel>
                <div className="max-h-52 min-h-0 overflow-y-auto rounded-md border border-border">
                  <LoadDocumentPicker
                    options={shipmentOptions}
                    value={field.value}
                    onChange={field.onChange}
                    isLoading={shipmentsQuery.isLoading}
                    emptyText="No shipments available."
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transferIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transfers</FormLabel>
                <div className="max-h-52 min-h-0 overflow-y-auto rounded-md border border-border">
                  <LoadDocumentPicker
                    options={transferOptions}
                    value={field.value}
                    onChange={field.onChange}
                    isLoading={transfersQuery.isLoading}
                    emptyText="No transfers available."
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
