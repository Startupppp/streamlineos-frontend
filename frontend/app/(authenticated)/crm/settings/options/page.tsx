"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useCrmMetadata,
  useCreateOption,
  useUpdateOption,
  useDeleteOption,
  crmMetadataQueryOptions,
} from "@/hooks/api/crm";
import { CrmOptionBadge } from "@/features/crm/shared/metadata";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata/crm-color-tokens";
import { CrmColorPicker } from "@/features/crm/settings/shared/crm-color-picker";
import type { CrmOption, CrmOptionType, CrmMetadataResponse } from "@/types/crm/metadata";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const OPTION_TYPES: { type: CrmOptionType; label: string }[] = [
  { type: "lead_status", label: "Lead Status" },
  { type: "priority", label: "Priority" },
  { type: "source", label: "Source" },
  { type: "lost_reason", label: "Lost Reason" },
  { type: "activity_type", label: "Activity Type" },
  { type: "competitor", label: "Competitor" },
  { type: "forecast_category", label: "Forecast Category" },
  { type: "task_type", label: "Task Type" },
];

function slugify(val: string) {
  return val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

interface AddRowProps {
  type: CrmOptionType;
  sortOrder: number;
  onCancel: () => void;
}

function AddOptionRow({ type, sortOrder, onCancel }: AddRowProps) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [color, setColor] = useState("slate");
  const keyTouched = useRef(false);
  const createOption = useCreateOption();

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
    if (!keyTouched.current) setKey(slugify(e.target.value));
  }, []);

  const handleKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    keyTouched.current = true;
    setKey(e.target.value);
  }, []);

  const handleColorChange = useCallback((token: string) => setColor(token), []);

  const handleSave = useCallback(() => {
    if (!label.trim() || !key.trim()) return;
    createOption.mutate(
      {
        type,
        key: key.trim(),
        label: label.trim(),
        color,
        description: null,
        icon: null,
        sortOrder,
        isActive: true,
        isTerminal: false,
        metadata: null,
      },
      {
        onSuccess: () => { toast.success("Option created"); onCancel(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createOption, type, key, label, color, sortOrder, onCancel]);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-t border-border bg-muted/30">
      <span className="size-2 rounded-full bg-slate-300 shrink-0" />
      <Input
        value={label}
        onChange={handleLabelChange}
        placeholder="Label"
        className="h-7 text-xs w-32 shrink-0"
        autoFocus
      />
      <Input
        value={key}
        onChange={handleKeyChange}
        placeholder="key"
        className="h-7 text-xs font-mono w-28 shrink-0"
      />
      <CrmColorPicker value={color} onChange={handleColorChange} />
      <LoadingButton
        size="sm"
        className="h-7 text-xs px-2"
        isPending={createOption.isPending}
        loadingText="Saving…"
        onClick={handleSave}
        disabled={!label.trim() || !key.trim()}
      >
        Save
      </LoadingButton>
      <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

interface OptionRowProps {
  option: CrmOption;
  showTerminal: boolean;
  onDeleteRequest: (id: string) => void;
}

function OptionRow({ option, showTerminal, onDeleteRequest }: OptionRowProps) {
  const qc = useQueryClient();
  const updateOption = useUpdateOption();
  const { dotClass } = getCrmTokenClasses(option.color);

  const patchCache = useCallback((patch: Partial<CrmOption>) => {
    qc.setQueryData<CrmMetadataResponse>(
      crmMetadataQueryOptions().queryKey,
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          options: {
            ...prev.options,
            [option.type]: prev.options[option.type].map((o) =>
              o.id === option.id ? { ...o, ...patch } : o
            ),
          },
        };
      }
    );
  }, [qc, option.id, option.type]);

  const handleLabelBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const newLabel = e.target.value.trim();
    if (!newLabel || newLabel === option.label) return;
    patchCache({ label: newLabel });
    updateOption.mutate(
      { type: option.type, id: option.id, label: newLabel },
      { onError: (err) => { patchCache({ label: option.label }); toast.error(getErrorMessage(err)); } }
    );
  }, [updateOption, option, patchCache]);

  const handleTerminalToggle = useCallback((checked: boolean) => {
    patchCache({ isTerminal: checked });
    updateOption.mutate(
      { type: option.type, id: option.id, isTerminal: checked },
      { onError: (err) => { patchCache({ isTerminal: option.isTerminal }); toast.error(getErrorMessage(err)); } }
    );
  }, [updateOption, option, patchCache]);

  const handleActiveToggle = useCallback((checked: boolean) => {
    patchCache({ isActive: checked });
    updateOption.mutate(
      { type: option.type, id: option.id, isActive: checked },
      { onError: (err) => { patchCache({ isActive: option.isActive }); toast.error(getErrorMessage(err)); } }
    );
  }, [updateOption, option, patchCache]);

  const handleColorChange = useCallback((token: string) => {
    patchCache({ color: token });
    updateOption.mutate(
      { type: option.type, id: option.id, color: token },
      { onError: (err) => { patchCache({ color: option.color }); toast.error(getErrorMessage(err)); } }
    );
  }, [updateOption, option, patchCache]);

  const handleDeleteRequest = useCallback(() => onDeleteRequest(option.id), [onDeleteRequest, option.id]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 border-b border-border last:border-0 hover:bg-muted/20 transition-colors",
        !option.isActive && "opacity-50"
      )}
    >
      <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
      <CrmOptionBadge option={option} size="table" className="shrink-0" />
      <Input
        key={option.label}
        defaultValue={option.label}
        onBlur={handleLabelBlur}
        className="h-7 text-xs w-32 shrink-0 border-transparent hover:border-input focus:border-input bg-transparent"
      />
      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
        {option.key}
      </span>
      <div className="flex items-center gap-3 ml-auto shrink-0">
        {showTerminal && (
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
            Terminal
            <Switch
              checked={option.isTerminal}
              onCheckedChange={handleTerminalToggle}
              className="scale-75"
            />
          </label>
        )}
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          Active
          <Switch
            checked={option.isActive}
            onCheckedChange={handleActiveToggle}
            className="scale-75"
          />
        </label>
        <CrmColorPicker value={option.color} onChange={handleColorChange} />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={handleDeleteRequest}
          aria-label="Delete option"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function CrmOptionsPage() {
  const [selectedType, setSelectedType] = useState<CrmOptionType>("lead_status");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useCrmMetadata();
  const deleteOption = useDeleteOption();

  const options = data?.options[selectedType] ?? [];
  const sortedOptions = options.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedLabel = OPTION_TYPES.find((t) => t.type === selectedType)?.label ?? selectedType;

  const handleTypeSelect = useCallback((type: CrmOptionType) => {
    setSelectedType(type);
    setShowAdd(false);
  }, []);

  const handleMobileTypeSelect = useCallback((val: string) => {
    handleTypeSelect(val as CrmOptionType);
  }, [handleTypeSelect]);

  const handleShowAdd = useCallback(() => setShowAdd(true), []);
  const handleCancelAdd = useCallback(() => setShowAdd(false), []);

  const handleDeleteRequest = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    deleteOption.mutate(
      { type: selectedType, id: deleteTargetId },
      {
        onSuccess: () => { toast.success("Option deleted"); setDeleteTargetId(null); },
        onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
      }
    );
  }, [deleteOption, selectedType, deleteTargetId]);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) handleDeleteCancel();
  }, [handleDeleteCancel]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option</AlertDialogTitle>
            <AlertDialogDescription>
              This option will be permanently deleted. Records using it may display a fallback label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageWrapper
        title="Options"
        subtitle="Manage dropdown values used across CRM records"
      >
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : isError ? (
          <EmptyState
            title="Failed to load options"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <div className="flex gap-4">
            <div className="hidden md:flex flex-col w-48 shrink-0 gap-0.5">
              {OPTION_TYPES.map(({ type, label }) => {
                const count = (data?.options[type] ?? []).length;
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeSelect(type)}
                    className={cn(
                      "w-full text-left text-xs px-3 py-2 rounded-md flex items-center justify-between gap-2 transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{label}</span>
                    {count > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] h-4 px-1.5 py-0 shrink-0",
                          isActive
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="md:hidden">
                <Select value={selectedType} onValueChange={handleMobileTypeSelect}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTION_TYPES.map(({ type, label }) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{selectedLabel}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0">
                    {sortedOptions.length}
                  </Badge>
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={handleShowAdd} disabled={showAdd}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {sortedOptions.length === 0 && !showAdd ? (
                <EmptyState
                  title={`No ${selectedLabel.toLowerCase()} options`}
                  description="Add options to populate this dropdown in CRM records."
                  action={{ label: "Add Option", onClick: handleShowAdd }}
                  compact
                  className="min-h-[160px] border border-border rounded-xl bg-transparent"
                />
              ) : (
                <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    {sortedOptions.map((option) => (
                      <OptionRow
                        key={option.id}
                        option={option}
                        showTerminal={selectedType === "lead_status"}
                        onDeleteRequest={handleDeleteRequest}
                      />
                    ))}
                    {showAdd && (
                      <AddOptionRow
                        type={selectedType}
                        sortOrder={sortedOptions.length}
                        onCancel={handleCancelAdd}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
