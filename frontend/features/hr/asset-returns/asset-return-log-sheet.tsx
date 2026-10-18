"use client";

import { useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";
import { HrSheet } from "@/components/shared/hr-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserDisplayName } from "@/lib/person-display";
import { CONDITIONS } from "./asset-return-constants";
import type { Asset, EmployeeListItem } from "@/types/hr";

export interface AssetReturnFieldErrors {
  asset?: string;
  employee?: string;
  condition?: string;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-xs">
      {message}
    </p>
  );
}

interface AssetReturnLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetOptions: ComboboxOption[];
  assetLoadError?: string;
  assetsLoading: boolean;
  allAssignedAssets: Asset[];
  selectedAssetId: string;
  resolvedUserId: string;
  resolvedEmployee: EmployeeListItem | null;
  overrideUserId: string | null;
  condition: string;
  notes: string;
  notesError: string;
  fieldErrors: AssetReturnFieldErrors;
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
  assetLoadError,
  assetsLoading,
  allAssignedAssets,
  selectedAssetId,
  resolvedUserId,
  resolvedEmployee,
  overrideUserId,
  condition,
  notes,
  notesError,
  fieldErrors,
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
      title="Log asset return"
      description="Select the asset being returned. The employee will be auto-filled from the assignment."
      onSubmit={onSubmit}
      submitLabel="Log return"
      isPending={isPending}
    >
      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          Asset <span className="text-destructive" aria-hidden="true">*</span>
        </p>
        <Combobox
          options={assetOptions}
          value={selectedAssetId}
          onChange={onAssetChange}
          placeholder="Select assigned asset to return…"
          searchPlaceholder="Search assets…"
          ariaLabel="Asset"
        />
        {assetLoadError === undefined && allAssignedAssets.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {assetsLoading ? "Loading assigned assets…" : "No currently assigned assets found."}
          </p>
        )}
        <FieldError id="asset-return-asset-error" message={fieldErrors.asset ?? assetLoadError} />
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
        <p className="text-sm font-medium">
          Employee <span className="text-destructive" aria-hidden="true">*</span>
          {employeeAutoFilled && resolvedEmployee && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (auto-filled from assignment)
            </span>
          )}
        </p>
        {employeeAutoFilled && resolvedEmployee ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {getUserDisplayName(resolvedEmployee)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleOverrideClick}
            >
              Change
            </Button>
          </div>
        ) : (
          <EmployeePicker
            value={resolvedUserId}
            onChange={onEmployeeOverrideChange}
            placeholder="Select employee…"
            ariaLabel="Employee"
          />
        )}
        <FieldError id="asset-return-employee-error" message={fieldErrors.employee} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="asset-return-condition" className="text-sm font-medium">
          Condition <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <Select value={condition} onValueChange={onConditionChange}>
          <SelectTrigger id="asset-return-condition" aria-label="Condition" aria-invalid={fieldErrors.condition ? true : undefined} aria-describedby={fieldErrors.condition ? "asset-return-condition-error" : undefined}>
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
        <FieldError id="asset-return-condition-error" message={fieldErrors.condition} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="asset-return-notes" className="text-sm font-medium">
          Notes
        </label>
        <Textarea
          id="asset-return-notes"
          placeholder="Any notes about the condition or return circumstances…"
          value={notes}
          onChange={onNotesChange}
          rows={3}
          className="resize-none w-full"
          maxLength={1000}
          aria-describedby="asset-return-notes-hint"
        />
        <p id="asset-return-notes-hint" className="text-xs text-muted-foreground">
          {notes.length}/1000
        </p>
        {notesError && (
          <p role="alert" className="text-xs text-destructive">{notesError}</p>
        )}
      </div>
    </HrSheet>
  );
}
