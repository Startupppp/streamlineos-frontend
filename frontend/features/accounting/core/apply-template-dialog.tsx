"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCoaTemplates, useApplyTemplate } from "@/hooks/api/accounting/core";
import type { CoaTemplate } from "@/hooks/api/accounting/core";

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyTemplateDialog({ open, onOpenChange }: ApplyTemplateDialogProps) {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const templatesQuery = useCoaTemplates();
  const applyMutation = useApplyTemplate();

  const templates = templatesQuery.data?.items ?? [];
  const selected = templates.find((t: CoaTemplate) => t.key === selectedKey);

  function handleSelectChange(value: string): void {
    setSelectedKey(value);
  }

  function handleClose(open: boolean): void {
    if (!open) {
      setSelectedKey("");
    }
    onOpenChange(open);
  }

  function handleApply(): void {
    if (!selectedKey) return;
    applyMutation.mutate(
      { templateKey: selectedKey },
      {
        onSuccess: (result) => {
          toast.success(`Template applied: ${result.inserted} accounts added, ${result.skipped} skipped`);
          handleClose(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Apply chart of accounts template</DialogTitle>
          <DialogDescription>
            Select a template to pre-populate your chart of accounts. Existing accounts will not be modified.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Select value={selectedKey} onValueChange={handleSelectChange} disabled={templatesQuery.isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t: CoaTemplate) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label} ({t.country})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <p className="text-xs text-muted-foreground">
              Will add up to <span className="font-medium">{selected.accountCount}</span> accounts
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={applyMutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            isPending={applyMutation.isPending}
            loadingText="Applying…"
            disabled={!selectedKey}
            onClick={handleApply}
          >
            Apply template
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
