"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createBlueprintSchema, type CreateBlueprintFormValues } from "./create-blueprint-dialog-schema";

import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";

import { useCreateBlueprint, useCrmMetadata } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";

export function CreateBlueprintDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { data: metadata } = useCrmMetadata();
  const createBlueprint = useCreateBlueprint();

  const form = useForm<CreateBlueprintFormValues>({
    resolver: zodResolver(createBlueprintSchema),
    defaultValues: { name: "", description: "", pipelineId: "" },
  });

  const handleSubmit = useCallback(
    (values: CreateBlueprintFormValues) => {
      createBlueprint.mutate(
        {
          name: values.name,
          description: values.description ?? null,
          pipelineId: values.pipelineId,
          isActive: true,
        },
        {
          onSuccess: (created) => {
            toast.success("Blueprint created");
            form.reset();
            onOpenChange(false);
            onCreated(created.id);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [createBlueprint, form, onOpenChange, onCreated]
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) form.reset();
      onOpenChange(v);
    },
    [form, onOpenChange]
  );

  const pipelines = metadata?.pipelines ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Blueprint</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Blueprint name" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pipelineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select pipeline" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pipelines.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-sm">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <LoadingButton
                type="submit"
                isPending={createBlueprint.isPending}
                loadingText="Creating…"
              >
                Create Blueprint
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
