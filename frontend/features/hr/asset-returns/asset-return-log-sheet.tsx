"use client";

import { useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { CONDITIONS } from "./asset-return-constants";
import type { Asset, Employee } from "@/types/hr";

interface AssetReturnLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetOptions: ComboboxOption[];
  employeeOptions: ComboboxOption[];
  allAssignedAssets: Asset[];
  selectedAssetId: string;
  resolvedUserId: string;
  resolvedEmployee: Employee | null;
  overrideUserId: string | null;
  condition: string;
  notes: string;
  notesError: string;
  isPending: boolean;
  onAssetChange: (id: string) => void;
  onEmployeeOverrideChange: (id: string) => void;
  onConditionChange: (val: string) => void;
  onNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onOverrideUserId: (id: string) => void;
  onSubmit: () => void;
}

export function AssetReturnLogSheet({
  open,
  onOpenChange,
  assetOptions,
  employeeOptions,
  allAssignedAssets,
  selectedAssetId,
  resolvedUserId,
  resolvedEmployee,
  overrideUserId,
  condition,
  notes,
  notesError,
  isPending,
  onAssetChange,
  onEmployeeOverrideChange,
  onConditionChange,
  onNotesChange,
  onOverrideUserId,
  onSubmit,
}: AssetReturnLogSheetProps) {
  const selectedAsset = allAssignedAssets.find(
    (a) => String(a.id) === selectedAssetId,
  );
  const employeeAutoFilled = !!selectedAsset?.assignedTo && !overrideUserId;

  const handleOverrideClick = useCallback(() => {
    if (resolvedEmployee) {
      onOverrideUserId(resolvedEmployee.id);
    }
  }, [resolvedEmployee, onOverrideUserId]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log Asset Return"
      description="Select the asset being returned. The employee will be auto-filled from the assignment."
      onSubmit={onSubmit}
      submitLabel="Log Return"
      isPending={isPending}
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Asset <span className="text-destructive">*</span>
        </label>
        <Combobox
          options={assetOptions}
          value={selectedAssetId}
          onChange={onAssetChange}
          placeholder="Select assigned asset to return…"
          searchPlaceholder="Search assets…"
        />
        {allAssignedAssets.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No currently assigned assets found.
          </p>
        )}
      </div>

      {selectedAsset && (
        <div className="rounded-xl bg-muted/50 border border-border p-3 text-xs space-y-1">
          <p>
            <span className="font-medium">Type:</span> {selectedAsset.type}
          </p>
          {selectedAsset.serialNumber && (
            <p>
              <span className="font-medium">Serial Number:</span>{" "}
              {selectedAsset.serialNumber}
            </p>
          )}
          {selectedAsset.brand && (
            <p>
              <span className="font-medium">Brand:</span>{" "}
              {selectedAsset.brand}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Employee <span className="text-destructive">*</span>
          {employeeAutoFilled && resolvedEmployee && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (auto-filled from assignment)
            </span>
          )}
        </label>
        {employeeAutoFilled && resolvedEmployee ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {getUserDisplayName(resolvedEmployee)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={handleOverrideClick}
            >
              Change
            </Button>
          </div>
        ) : (
          <Combobox
            options={employeeOptions}
            value={resolvedUserId}
            onChange={onEmployeeOverrideChange}
            placeholder="Select employee…"
            searchPlaceholder="Search by name…"
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Condition <span className="text-destructive">*</span>
        </label>
        <Select value={condition} onValueChange={onConditionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select condition…" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Notes
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            ({notes.length}/1000)
          </span>
        </label>
        <Textarea
          placeholder="Any notes about the condition or return circumstances…"
          value={notes}
          onChange={onNotesChange}
          rows={3}
          className="resize-none w-full"
          maxLength={1000}
        />
        {notesError && (
          <p className="text-xs text-destructive">{notesError}</p>
        )}
      </div>
    </HrSheet>
  );
}
