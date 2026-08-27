"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { InventoryReferenceCombobox } from "@/components/inventory/inventory-reference-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateLoad } from "@/hooks/api/inventory/shipping";
import { getErrorMessage } from "@/lib/get-error-message";

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

interface RemoveMemberButtonProps {
  index: number;
  onRemove: (index: number) => void;
}

function RemoveMemberButton({ index, onRemove }: RemoveMemberButtonProps) {
  function handleClick(): void {
    onRemove(index);
  }

  return (
    <AnimatedIconButton
      type="button"
      icon={Trash2Icon}
      iconSize={14}
      iconClassName="text-destructive"
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      aria-label="Remove from load"
      onClick={handleClick}
    />
  );
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
      toast.error(getErrorMessage(error));
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
        <form id="load-create-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Morning run batch" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FormLabel className="text-xs">Members</FormLabel>
              <AnimatedIconButton
                type="button"
                icon={PlusIcon}
                iconSize={12}
                iconClassName="mr-1"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleAddMember}
              >
                Add
              </AnimatedIconButton>
            </div>

            {fields.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No members added. Click Add to include shipments or transfers.
              </p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`members.${index}.type`}
                  render={({ field: f }) => (
                    <FormItem className="w-[130px] shrink-0">
                      <FormLabel className="text-micro font-semibold text-foreground/80">Type</FormLabel>
                      <Select value={f.value} onValueChange={f.onChange}>
                        <FormControl>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SHIPMENT">Shipment</SelectItem>
                          <SelectItem value="TRANSFER">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`members.${index}.referenceId`}
                  render={({ field: f }) => (
                    <FormItem className="flex-1 min-w-0">
                      <FormLabel className="text-micro font-semibold text-foreground/80">Reference</FormLabel>
                      <FormControl>
                        <InventoryReferenceCombobox
                          type={form.watch(`members.${index}.type`)}
                          value={f.value}
                          onChange={f.onChange}
                          className="text-xs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <RemoveMemberButton index={index} onRemove={handleRemoveMember} />
              </div>
            ))}
          </div>
        </form>
      </Form>
    </AppSheet>
  );
}
