"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateLoad } from "@/hooks/api/inventory/shipping";

const memberSchema = z.object({
  type: z.enum(["SHIPMENT", "TRANSFER"]),
  referenceId: z.string().min(1, "Required"),
});

const loadSchema = z.object({
  name: z.string(),
  members: z.array(memberSchema),
});

type LoadFormValues = z.infer<typeof loadSchema>;

interface LoadCreateSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LoadCreateSheet({ open, onOpenChange }: LoadCreateSheetProps) {
  const createMutation = useCreateLoad();

  const form = useForm<LoadFormValues>({
    resolver: zodResolver(loadSchema),
    defaultValues: {
      name: "",
      members: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  function handleClose(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleAddMember(): void {
    append({ type: "SHIPMENT", referenceId: "" });
  }

  function handleRemoveMember(index: number): void {
    remove(index);
  }

  function handleMemberTypeChange(index: number, value: string): void {
    if (value !== "SHIPMENT" && value !== "TRANSFER") return;
    form.setValue(`members.${index}.type`, value);
  }

  async function onSubmit(values: LoadFormValues): Promise<void> {
    const members = values.members
      .filter((m) => m.referenceId.trim())
      .map((m) => ({
        type: m.type,
        referenceId: Number(m.referenceId),
      }));
    try {
      await createMutation.mutateAsync({
        name: values.name.trim() || undefined,
        members,
      });
      toast.success("Load created");
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create load");
    }
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
          <Button
            type="submit"
            form="load-create-form"
            size="sm"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Load"}
          </Button>
        </div>
      }
    >
      <form id="load-create-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="load-name" className="text-xs">Name (optional)</Label>
          <Input
            id="load-name"
            placeholder="e.g. Morning run batch"
            className="h-8 text-sm"
            {...form.register("name")}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Members</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleAddMember}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No members added. Click Add to include shipments or transfers.
            </p>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="space-y-1 w-[130px] shrink-0">
                <Label className="text-[10px] text-muted-foreground">Type</Label>
                <Select
                  value={form.watch(`members.${index}.type`)}
                  onValueChange={(v) => handleMemberTypeChange(index, v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHIPMENT">Shipment</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <Label className="text-[10px] text-muted-foreground">Reference ID</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="ID"
                  className="h-7 text-xs"
                  {...form.register(`members.${index}.referenceId`)}
                />
                {form.formState.errors.members?.[index]?.referenceId && (
                  <p className="text-[10px] text-destructive">
                    {form.formState.errors.members[index].referenceId.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleRemoveMember(index)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </form>
    </AppSheet>
  );
}
