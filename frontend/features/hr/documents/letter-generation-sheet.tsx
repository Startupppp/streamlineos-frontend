"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrEmployees, useHrTemplates } from "@/hooks/api/hr";
import { useRenderLetter, useSaveLetter } from "@/hooks/api/hr/letters";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

interface LetterGenerationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function LetterGenerationSheet({ open, onOpenChange, onSaved }: LetterGenerationSheetProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [extraContext, setExtraContext] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTemplateVersion, setPreviewTemplateVersion] = useState(1);
  const [extraKey, setExtraKey] = useState("");
  const [extraVal, setExtraVal] = useState("");

  const { data: templatesData } = useHrTemplates({ kind: "letter" });
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 300);
  const employeesQuery = useHrEmployees(
    {
      limit: 20,
      search: debouncedEmployeeSearch || undefined,
      isActive: "true",
    },
    { enabled: open },
  );
  const renderLetter = useRenderLetter();
  const saveLetter = useSaveLetter();

  const templates = Array.isArray(templatesData?.data)
    ? templatesData.data
    : Array.isArray(templatesData)
    ? templatesData
    : [];

  const handlePreview = useCallback(() => {
    if (!templateId) { toast.error("Select a template"); return; }
    renderLetter.mutate(
      {
        templateId: parseInt(templateId, 10),
        employeeUserId: employeeId || undefined,
        extraContext: Object.keys(extraContext).length ? extraContext : undefined,
      },
      {
        onSuccess: (data) => {
          setPreviewHtml(data.outputHtml);
          setPreviewTemplateVersion(data.templateVersion);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [templateId, employeeId, extraContext, renderLetter]);

  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      setEmployeeId("");
      setEmployeeSearch("");
      setTemplateId("");
      setExtraContext({});
      setPreviewHtml(null);
    }
    onOpenChange(open);
  }, [onOpenChange]);

  const handleSave = useCallback(() => {
    if (!previewHtml || !templateId) return;
    saveLetter.mutate(
      {
        templateId: parseInt(templateId, 10),
        templateVersion: previewTemplateVersion,
        employeeUserId: employeeId || undefined,
        outputHtml: previewHtml,
        contextSnapshot: extraContext,
      },
      {
        onSuccess: () => {
          toast.success("Letter saved");
          onSaved?.();
          handleClose(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [previewHtml, templateId, employeeId, extraContext, previewTemplateVersion, saveLetter, onSaved, handleClose]);

  const handleAddExtra = useCallback(() => {
    if (!extraKey.trim()) return;
    setExtraContext((prev) => ({ ...prev, [extraKey.trim()]: extraVal }));
    setExtraKey("");
    setExtraVal("");
  }, [extraKey, extraVal]);

  const handleExtraKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setExtraKey(e.target.value), []);
  const handleExtraValChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setExtraVal(e.target.value), []);

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data?.data ?? []).map((employee) => ({
        value: employee.id,
        label:
          `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
          employee.email,
        sublabel: employee.designation ?? employee.email,
      })),
    [employeesQuery.data],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={handleClose}
      title="Generate Letter"
      description="Select a template and employee to generate an HR letter."
      showSubmit={false}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Combobox
            options={employeeOptions}
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="Select employee (optional)..."
            searchPlaceholder="Search employees..."
            emptyText={employeesQuery.isLoading ? "Loading employees..." : "No employees found."}
            onSearchChange={setEmployeeSearch}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Letter Template <span className="text-destructive">*</span></label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="">
              <SelectValue placeholder="Select template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                  {t.letterType ? ` (${t.letterType.replace(/_/g, " ")})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Override Variables</label>
          <div className="flex gap-2">
            <Input
              placeholder="Variable name"
              value={extraKey}
              onChange={handleExtraKeyChange}
              className="text-xs"
            />
            <Input
              placeholder="Value"
              value={extraVal}
              onChange={handleExtraValChange}
              className="text-xs"
            />
            <Button size="sm" variant="outline" className="shrink-0" onClick={handleAddExtra}>
              Add
            </Button>
          </div>
          {Object.keys(extraContext).length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {Object.entries(extraContext).map(([k, v]) => (
                <p key={k}><span className="font-mono text-foreground">{k}</span>: {v}</p>
              ))}
            </div>
          )}
        </div>

        <LoadingButton
          variant="outline"
          className="w-full"
          onClick={handlePreview}
          isPending={renderLetter.isPending}
          loadingText="Rendering..."
        >
          Preview Letter
        </LoadingButton>

        {renderLetter.isPending && (
          <Skeleton className="h-48 w-full rounded-xl" />
        )}

        {previewHtml && !renderLetter.isPending && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                sandbox="allow-same-origin"
                className="w-full h-64 bg-card"
                title="Letter preview"
              />
            </div>
          </div>
        )}

        {previewHtml && (
          <LoadingButton
            className="w-full"
            onClick={handleSave}
            isPending={saveLetter.isPending}
            loadingText="Saving..."
          >
            Save Letter
          </LoadingButton>
        )}
      </div>
    </HrSheet>
  );
}
