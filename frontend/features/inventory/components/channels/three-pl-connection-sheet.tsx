"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useCreateThreePlConnection,
  useUpdateThreePlConnection,
  type ThreePlConnection,
} from "@/hooks/api/inventory/channels";
import { getErrorMessage } from "@/lib/get-error-message";

const configPairSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const connectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  providerKey: z.string().min(1, "Provider key is required"),
  isActive: z.boolean(),
  configPairs: z.array(configPairSchema),
});

type ConnectionFormValues = z.infer<typeof connectionSchema>;

interface ThreePlConnectionSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connection?: ThreePlConnection;
}

function buildDefaultValues(connection?: ThreePlConnection): ConnectionFormValues {
  const pairs = connection?.config
    ? Object.entries(connection.config).map(([key, value]) => ({ key, value }))
    : [];
  return {
    name: connection?.name ?? "",
    providerKey: connection?.providerKey ?? "",
    isActive: connection?.isActive ?? true,
    configPairs: pairs,
  };
}

function configToRecord(pairs: Array<{ key: string; value: string }>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { key, value } of pairs) {
    if (key.trim()) {
      result[key.trim()] = value;
    }
  }
  return result;
}

export function ThreePlConnectionSheet({
  open,
  onOpenChange,
  connection,
}: ThreePlConnectionSheetProps) {
  const isEdit = connection !== undefined;
  const createMutation = useCreateThreePlConnection();
  const updateMutation = useUpdateThreePlConnection();

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: buildDefaultValues(connection),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "configPairs",
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(connection));
    }
  }, [open, connection, form]);

  function handleOpenChange(next: boolean): void {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handleCancel(): void {
    form.reset();
    onOpenChange(false);
  }

  function handleAddConfig(): void {
    append({ key: "", value: "" });
  }

  async function onSubmit(values: ConnectionFormValues): Promise<void> {
    const config = configToRecord(values.configPairs);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          connectionId: connection.id,
          name: values.name.trim(),
          isActive: values.isActive,
          config: Object.keys(config).length > 0 ? config : undefined,
        });
        toast.success("Connection updated");
      } else {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          providerKey: values.providerKey.trim(),
          config: Object.keys(config).length > 0 ? config : undefined,
        });
        toast.success("Connection created");
      }
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const showNotConnectedBanner =
    isEdit &&
    connection.lastSyncError !== null &&
    connection.lastSyncError.toLowerCase().includes("not connected");

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? "Edit 3PL Connection" : "Add 3PL Connection"}
      description={
        isEdit
          ? "Update provider credentials and connection settings."
          : "Connect a third-party logistics provider."
      }
      footer={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="3pl-connection-form"
            size="sm"
            disabled={isPending}
          >
            {isPending
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Add connection"}
          </Button>
        </div>
      }
    >
      {showNotConnectedBanner && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 mb-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0 dark:text-amber-400" />
          <p className="text-xs text-amber-700 leading-relaxed dark:text-amber-300">
            This provider is not connected. Update credentials and sync to activate.
          </p>
        </div>
      )}

      <Form {...form}>
        <form id="3pl-connection-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Flexport US" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="providerKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider key *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. flexport, shipbob"
                    disabled={isEdit}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    id="3pl-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel htmlFor="3pl-active" className="text-sm font-normal cursor-pointer">
                  Active
                </FormLabel>
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Configuration</span>
              <AnimatedIconButton
                type="button"
                icon={PlusIcon}
                iconSize={12}
                iconClassName="mr-0.5"
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleAddConfig}
              >
                Add config
              </AnimatedIconButton>
            </div>

            {fields.length > 0 && (
              <div className="space-y-2 rounded-md border border-border p-3">
                {fields.map((fieldItem, index) => {
                  function handleRemove(): void {
                    remove(index);
                  }
                  return (
                    <div key={fieldItem.id} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`configPairs.${index}.key`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Config key"
                                className="text-xs"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`configPairs.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Config value"
                                className="text-xs"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <AnimatedIconButton
                        type="button"
                        icon={XIcon}
                        iconSize={14}
                        variant="ghost"
                        size="icon"
                        className="w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={handleRemove}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </Form>
    </AppSheet>
  );
}
