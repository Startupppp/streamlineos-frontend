"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateQualityHold } from "@/hooks/api/inventory/quality";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { useLots, useSerials } from "@/hooks/api/inventory/traceability";

const schema = z.object({
  variantId: z.string().min(1, "Required").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) > 0,
    "Must be a positive integer",
  ),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
  lotId: z.string().optional(),
  serialId: z.string().optional(),
  qty: z.string().min(1, "Required").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) > 0,
    "Must be > 0",
  ),
  reason: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function HoldCreateSheet({ open, onOpenChange }: Props) {
  const createMut = useCreateQualityHold();
  const { data: warehouses = [] } = useWarehouses();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      variantId: "",
      warehouseId: "",
      locationId: "",
      lotId: "",
      serialId: "",
      qty: "",
      reason: "",
    },
  });

  function handleClose(): void {
    onOpenChange(false);
  }

  const warehouseId = form.watch("warehouseId");
  const variantId = form.watch("variantId");
  const numericVariantId = Number(variantId);
  const variantEnabled = Number.isInteger(numericVariantId) && numericVariantId > 0;

  const { data: locations = [] } = useLocations(warehouseId ? Number(warehouseId) : 0);
  const { data: lotsData } = useLots(
    variantEnabled ? { variantId: numericVariantId, status: "ACTIVE", limit: 100 } : undefined,
  );
  const { data: serialsData } = useSerials(
    variantEnabled ? { variantId: numericVariantId, status: "IN_STOCK", limit: 100 } : undefined,
  );

  const lots = lotsData?.items ?? [];
  const serials = serialsData?.items ?? [];

  function handleSubmit(values: FormValues): void {
    createMut.mutate(
      {
        productVariantId: Number(values.variantId),
        locationId: values.locationId !== "" && values.locationId !== undefined ? Number(values.locationId) : 0,
        ...(values.lotId !== "" && values.lotId !== undefined ? { lotId: Number(values.lotId) } : {}),
        ...(values.serialId !== "" && values.serialId !== undefined ? { serialId: Number(values.serialId) } : {}),
        quantity: Number(values.qty),
        reason: values.reason,
      },
      {
        onSuccess: () => {
          toast.success("Quality hold created");
          form.reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const footer = (
    <>
      <Button size="sm" variant="outline" onClick={handleClose}>Cancel</Button>
      <LoadingButton size="sm" onClick={form.handleSubmit(handleSubmit)} isPending={createMut.isPending} loadingText="Creating…">
        Create Hold
      </LoadingButton>
    </>
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Quality Hold"
      description="Place inventory on a quality hold"
      footer={footer}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Variant *</Label>
            <Controller
              control={form.control}
              name="variantId"
              render={({ field }) => (
                <ProductVariantCombobox
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    form.setValue("lotId", "");
                    form.setValue("serialId", "");
                  }}
                  className="text-xs"
                />
              )}
            />
            {form.formState.errors.variantId && (
              <p className="text-[10px] text-destructive">{form.formState.errors.variantId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Qty *</Label>
            <Input
              className="text-xs"
              type="number"
              placeholder="Quantity"
              {...form.register("qty")}
            />
            {form.formState.errors.qty && (
              <p className="text-[10px] text-destructive">{form.formState.errors.qty.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">
              Warehouse <span className="font-normal text-muted-foreground">(opt.)</span>
            </Label>
            <Controller
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => {
                    field.onChange(v === "none" ? "" : v);
                    form.setValue("locationId", "");
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={String(wh.id)}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">
              Location <span className="font-normal text-muted-foreground">(opt.)</span>
            </Label>
            <Controller
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  disabled={!warehouseId}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={warehouseId ? "Optional" : "Select warehouse first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name} ({loc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">
              Lot <span className="font-normal text-muted-foreground">(opt.)</span>
            </Label>
            <Controller
              control={form.control}
              name="lotId"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  disabled={!variantEnabled || lots.length === 0}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={variantEnabled ? "Optional" : "Select variant first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={String(lot.id)}>
                        {lot.lotNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">
              Serial <span className="font-normal text-muted-foreground">(opt.)</span>
            </Label>
            <Controller
              control={form.control}
              name="serialId"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  disabled={!variantEnabled || serials.length === 0}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={variantEnabled ? "Optional" : "Select variant first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {serials.map((serial) => (
                      <SelectItem key={serial.id} value={String(serial.id)}>
                        {serial.serialNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground/80">Reason *</Label>
          <Textarea
            className="text-xs min-h-[80px] resize-none"
            placeholder="Describe the reason for this hold…"
            {...form.register("reason")}
          />
          {form.formState.errors.reason && (
            <p className="text-[10px] text-destructive">{form.formState.errors.reason.message}</p>
          )}
        </div>
      </form>
    </AppSheet>
  );
}
