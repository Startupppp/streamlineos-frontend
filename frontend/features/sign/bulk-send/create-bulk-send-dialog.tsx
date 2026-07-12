"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignTemplates } from "@/hooks/api/sign/templates";
import { useCreateBulkSendJob } from "@/hooks/api/sign/bulk-send";

const MAPPED_FIELDS = ["name", "email", "phone"] as const;

export function CreateBulkSendDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const { data: templates } = useSignTemplates();
  const publishedTemplates = (templates ?? []).filter((t) => t.status === "published");
  const createJob = useCreateBulkSendJob();

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
      },
      error: (error) => toast.error(error.message),
    });
  }

  async function handleSubmit(dryRun: boolean) {
    if (!templateId) {
      toast.error("Please select a template");
      return;
    }
    if (rows.length === 0) {
      toast.error("Please upload a CSV file");
      return;
    }
    if (!mapping.name || !mapping.email) {
      toast.error("Please map both name and email columns");
      return;
    }
    try {
      const result = await createJob.mutateAsync({ templateId: Number(templateId), columnMapping: mapping, rows, dryRun });
      toast.success(dryRun ? `Dry run: ${result.job.successCount}/${result.job.totalCount} rows valid` : `Bulk send started for ${result.job.totalCount} rows`);
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
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a published template" />
              </SelectTrigger>
              <SelectContent>
                {publishedTemplates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>CSV file</Label>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="size-4" />
              {rows.length > 0 ? `${rows.length} rows loaded` : "Upload CSV"}
            </Button>
          </div>

          {headers.length > 0 && (
            <div className="space-y-2">
              <Label>Column mapping</Label>
              {MAPPED_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14 shrink-0 capitalize">{field}</span>
                  <Select value={mapping[field] ?? ""} onValueChange={(value) => setMapping((prev) => ({ ...prev, [field]: value }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Map column…" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={createJob.isPending}>
            Dry run
          </Button>
          <LoadingButton onClick={() => handleSubmit(false)} isPending={createJob.isPending} loadingText="Starting…">
            Start bulk send
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
