"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPipelineSchema, type CreatePipelineValues } from "./create-pipeline-dialog-schema";
import { toast } from "sonner";

import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

import { useCreatePipeline } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { PIPELINE_TYPES, slugify } from "./pipeline-constants";

export function CreatePipelineDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createPipeline = useCreatePipeline();
  const form = useForm<CreatePipelineValues>({
    resolver: zodResolver(createPipelineSchema),
    defaultValues: { name: "", type: "deal", key: "" },
  });

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("name", e.target.value);
    form.setValue("key", slugify(e.target.value));
  }, [form]);

  const handleSubmit = useCallback((data: CreatePipelineValues) => {
    createPipeline.mutate(
      { ...data, description: null, isDefault: false, isActive: true, sortOrder: 0 },
      {
        onSuccess: () => { toast.success("Pipeline created"); onOpenChange(false); form.reset(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createPipeline, onOpenChange, form]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) form.reset();
    onOpenChange(v);
  }, [onOpenChange, form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Pipeline</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} onChange={handleNameChange} placeholder="Sales Pipeline" className="text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PIPELINE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="key" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Key <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="sales-pipeline" className="text-sm font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <LoadingButton type="submit" size="sm" isPending={createPipeline.isPending} loadingText="Creating...">
                Create
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
