"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Papa from "papaparse";
import { toast } from "sonner";
import { CloudUploadIcon } from "@animateicons/react/lucide";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignTemplates } from "@/hooks/api/sign/templates";
import { useCreateBulkSendJob } from "@/hooks/api/sign/bulk-send";

const bulkSendSchema = z.object({
  templateId: z.string().min(1, "Select a template"),
  nameColumn: z.string().min(1, "Map the name column"),
  emailColumn: z.string().min(1, "Map the email column"),
  phoneColumn: z.string().optional(),
});

type BulkSendValues = z.infer<typeof bulkSendSchema>;

export function CreateBulkSendDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const { data: templates } = useSignTemplates();
  const publishedTemplates = (templates ?? []).filter((t) => t.status === "published");
  const createJob = useCreateBulkSendJob();

  const form = useForm<BulkSendValues>({
    resolver: zodResolver(bulkSendSchema),
    defaultValues: {
      templateId: "",
      nameColumn: "",
      emailColumn: "",
      phoneColumn: "",
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data);
        setHeaders(result.meta.fields ?? []);
        form.setValue("nameColumn", "");
        form.setValue("emailColumn", "");
        form.setValue("phoneColumn", "");
      },
      error: (error) => toast.error(error.message),
    });
  }

  async function handleSubmit(values: BulkSendValues, dryRun: boolean) {
    if (rows.length === 0) {
      toast.error("Please upload a CSV file");
      return;
    }
    const mapping: Record<string, string> = {
      name: values.nameColumn,
      email: values.emailColumn,
    };
    if (values.phoneColumn) {
      mapping.phone = values.phoneColumn;
    }
    try {
      const result = await createJob.mutateAsync({
        templateId: Number(values.templateId),
        columnMapping: mapping,
        rows,
        dryRun,
      });
      toast.success(
        dryRun
          ? `Dry run: ${result.job.successCount}/${result.job.totalCount} rows valid`
          : `Bulk send started for ${result.job.totalCount} rows`,
      );
      if (!dryRun) onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New bulk send</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Template <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a published template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {publishedTemplates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1.5">
              <Label>
                CSV file <span className="text-destructive">*</span>
              </Label>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              <AnimatedIconButton
                icon={CloudUploadIcon}
                iconClassName="mr-1.5"
                variant="outline"
                type="button"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                {rows.length > 0 ? `${rows.length} rows loaded` : "Upload CSV"}
              </AnimatedIconButton>
              {rows.length === 0 && form.formState.isSubmitted && (
                <p className="text-xs text-destructive">Please upload a CSV file</p>
              )}
            </div>

            {headers.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Column mapping <span className="text-destructive">*</span>
                </Label>
                <FormField
                  control={form.control}
                  name="nameColumn"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">name</span>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Map column…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emailColumn"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">email</span>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Map column…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneColumn"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">phone</span>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Map column… (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => form.handleSubmit((values) => handleSubmit(values, true))()}
            disabled={createJob.isPending}
          >
            Dry run
          </Button>
          <LoadingButton
            type="button"
            onClick={() => form.handleSubmit((values) => handleSubmit(values, false))()}
            isPending={createJob.isPending}
            loadingText="Starting…"
          >
            Start bulk send
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
