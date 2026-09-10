"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EntityFormSheet } from "@/components/shared";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useUpdateRequirement } from "@/hooks/api/inventory/projects";
import type { ProjectRequirement } from "@/hooks/api/inventory/projects";

const REQUIREMENT_MANAGE = "inventory:projects:manage";

const NO_STORE = "none";

/**
 * Mirrors `updateRequirementSchema`. The three settable statuses are the whole
 * list the backend accepts — `RESERVED`, `PARTIALLY_FULFILLED` and `FULFILLED`
 * are what reserving and dispatching make true, and offering one here would let
 * a line claim stock is held that nothing is holding.
 */
const schema = z.object({
  warehouseId: z.string().optional(),
  requiredQty: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a quantity with up to 4 decimal places")
    .refine((v) => Number(v) > 0, "The quantity has to be more than zero"),
  requiredBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
  status: z.enum(["DRAFT", "REQUESTED", "CANCELLED"]),
  notes: z.string().trim().max(1000).optional(),
});

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

const STATUS_LABEL: Readonly<Record<Output["status"], string>> = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  CANCELLED: "Cancelled",
};

interface RequirementEditSheetProps {
  requirement: ProjectRequirement;
  projectId: number;
}

/**
 * `PATCH /inventory/projects/:projectId/requirements/:requirementId` had no
 * caller. A line raised for the wrong quantity, the wrong date or the wrong
 * store could be reserved against and released, but never corrected — and a line
 * raised in error could not be cancelled, so it stayed on the site's shortfall
 * and in the at-risk count for good.
 *
 * A line already reserved or delivered keeps its status: the settable set is
 * only what a planner decides, and lowering the quantity below what is committed
 * is refused by the server rather than silently accepted here.
 */
export function RequirementEditSheet({ requirement, projectId }: RequirementEditSheetProps) {
  const canManage = useCan(REQUIREMENT_MANAGE);
  const [open, setOpen] = useState(false);
  const update = useUpdateRequirement();
  const { data: warehouses } = useWarehouses({ status: "active" });

  const settableStatus: Output["status"] =
    requirement.status === "DRAFT" || requirement.status === "CANCELLED"
      ? requirement.status
      : "REQUESTED";

  function handleOpen(): void {
    setOpen(true);
  }

  function handleSubmit(values: Output): void {
    update.mutate(
      {
        projectId,
        requirementId: requirement.id,
        warehouseId: values.warehouseId ? Number(values.warehouseId) : null,
        requiredQty: values.requiredQty,
        requiredBy: values.requiredBy ? values.requiredBy : null,
        status: values.status,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      },
      {
        onSuccess: () => {
          toast.success("Requirement updated");
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (!canManage) return null;

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={handleOpen}>
        Edit line
      </Button>
      <EntityFormSheet<Values, Output>
        open={open}
        onOpenChange={setOpen}
        title="Edit requirement"
        description={`${requirement.productName} · ${requirement.variantSku}`}
        resolver={zodResolver(schema)}
        defaultValues={{
          warehouseId: requirement.warehouseId ? String(requirement.warehouseId) : "",
          requiredQty: String(requirement.requiredQty),
          requiredBy: requirement.requiredBy ?? "",
          status: settableStatus,
          notes: requirement.notes ?? "",
        }}
        onSubmit={handleSubmit}
        isSubmitting={update.isPending}
        submitLabel="Save line"
        className="sm:max-w-md"
        resetOnOpen
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="requiredQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity needed</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormDescription>
                    It cannot go below what is already reserved or delivered on this line.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiredBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Needed by</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Served from</FormLabel>
                  <Select
                    value={field.value || NO_STORE}
                    onValueChange={(value) => field.onChange(value === NO_STORE ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Not yet chosen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      <SelectItem value={NO_STORE}>Not yet chosen</SelectItem>
                      {(warehouses ?? []).map((warehouse) => (
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      <SelectItem value="DRAFT">{STATUS_LABEL.DRAFT}</SelectItem>
                      <SelectItem value="REQUESTED">{STATUS_LABEL.REQUESTED}</SelectItem>
                      <SelectItem value="CANCELLED">{STATUS_LABEL.CANCELLED}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Reserved and delivered are set by reserving and dispatching, never by hand.
                  </FormDescription>
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
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormSheet>
    </>
  );
}
