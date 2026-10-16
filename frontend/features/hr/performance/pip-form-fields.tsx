"use client";

import { useCallback, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronsUpDown, Check } from "lucide-react";

type Employee = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  isActive?: boolean;
  role?: string;
};

type Objective = { objective: string; metric: string; deadline: string };

interface PipFormFieldsProps {
  hrEmployees: Employee[];
  pipUserId: string;
  editingUserName: string | null;
  hrRepId: string;
  hrRepPickerOpen: boolean;
  reason: string;
  startDate: string;
  endDate: string;
  notes: string;
  managerRating: string;
  objectives: Objective[];
  fieldErrors: Record<string, string>;
  isEditing: boolean;
  pipStartBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  pipEndBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  objectiveDeadlineBounds: { fromDate?: Date; fromYear?: number; toYear?: number };
  onHrRepPickerOpenChange: (open: boolean) => void;
  onSelectPipUser: (id: string) => void;
  onSelectHrRep: (id: string) => void;
  onReasonChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onNotesChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onManagerRatingChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAddObjective: () => void;
  onRemoveObjective: (index: number) => void;
  onUpdateObjectiveField: (
    index: number,
    field: "objective" | "metric" | "deadline",
    value: string,
  ) => void;
}

function getEmployeeLabel(e: Employee): string {
  return (
    [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email
  );
}

export function PipFormFields({
  hrEmployees,
  pipUserId,
  editingUserName,
  hrRepId,
  hrRepPickerOpen,
  reason,
  startDate,
  endDate,
  notes,
  managerRating,
  objectives,
  fieldErrors,
  isEditing,
  pipStartBounds,
  pipEndBounds,
  objectiveDeadlineBounds,
  onHrRepPickerOpenChange,
  onSelectPipUser,
  onSelectHrRep,
  onReasonChange,
  onStartDateChange,
  onEndDateChange,
  onNotesChange,
  onManagerRatingChange,
  onAddObjective,
  onRemoveObjective,
  onUpdateObjectiveField,
}: PipFormFieldsProps) {
  const handleObjectiveChange = useCallback(
    (idx: number, e: ChangeEvent<HTMLInputElement>) => {
      onUpdateObjectiveField(idx, "objective", e.target.value);
    },
    [onUpdateObjectiveField],
  );

  const handleMetricChange = useCallback(
    (idx: number, e: ChangeEvent<HTMLInputElement>) => {
      onUpdateObjectiveField(idx, "metric", e.target.value);
    },
    [onUpdateObjectiveField],
  );

  const handleDeadlineChange = useCallback(
    (idx: number, v: string) => {
      onUpdateObjectiveField(idx, "deadline", v);
    },
    [onUpdateObjectiveField],
  );

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          Employee <span className="text-destructive" aria-hidden="true">*</span>
        </p>
        {isEditing ? (
          <p className="border-input bg-muted/40 text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm">
            {editingUserName ?? "Unknown employee"}
          </p>
        ) : (
          <EmployeePicker
            value={pipUserId}
            onChange={onSelectPipUser}
            ariaLabel="Employee"
            className={fieldErrors.userId ? "border-destructive" : undefined}
          />
        )}
        {fieldErrors.userId && (
          <p className="text-xs text-destructive" role="alert">{fieldErrors.userId}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pip-hr-rep" className="text-sm font-medium">
          HR Representative{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Popover open={hrRepPickerOpen} onOpenChange={onHrRepPickerOpenChange}>
          <PopoverTrigger asChild>
            <Button
              id="pip-hr-rep"
              aria-label="HR Representative"
              variant="outline"
              role="combobox"
              aria-expanded={hrRepPickerOpen}
              className={cn(
                "w-full justify-between font-normal",
                fieldErrors.hrRepId && "border-destructive",
              )}
            >
              <span className="truncate">
                {hrRepId
                  ? (() => {
                      const e = hrEmployees.find((x) => x.id === hrRepId);
                      return e
                        ? getEmployeeLabel(e)
                        : "Select HR representative";
                    })()
                  : "None"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search HR representatives..." />
              <CommandList className="max-h-48 overflow-y-auto">
                <CommandEmpty>No HR representative found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="none"
                    onSelect={() => onSelectHrRep("")}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !hrRepId ? "opacity-100" : "opacity-0",
                      )}
                    />
                    None
                  </CommandItem>
                  {hrEmployees
                    .filter((e) => e.id !== pipUserId)
                    .map((e) => {
                      const label = getEmployeeLabel(e);
                      return (
                        <CommandItem
                          key={e.id}
                          value={`${label} ${e.email}`}
                          onSelect={() => onSelectHrRep(e.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              hrRepId === e.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {label}
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {fieldErrors.hrRepId && (
          <p className="text-xs text-destructive" role="alert">{fieldErrors.hrRepId}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pip-reason" className="text-sm font-medium">
          Reason <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <Textarea
          id="pip-reason"
          placeholder="Describe the performance concerns..."
          value={reason}
          onChange={onReasonChange}
          rows={3}
          maxLength={1000}
        />
        {fieldErrors.reason && (
          <p className="text-xs text-destructive" role="alert">{fieldErrors.reason}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="pip-start-date" className="text-sm font-medium">
            Start Date <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <DatePicker
            id="pip-start-date"
            value={startDate ?? ""}
            onChange={onStartDateChange}
            disabled={isEditing}
            placeholder="Pick a date"
            className="text-sm"
            fromDate={pipStartBounds.fromDate}
            fromYear={pipStartBounds.fromYear}
            toYear={pipStartBounds.toYear}
          />
          {fieldErrors.startDate && (
            <p className="text-xs text-destructive" role="alert">{fieldErrors.startDate}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pip-end-date" className="text-sm font-medium">
            End Date <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <DatePicker
            id="pip-end-date"
            value={endDate ?? ""}
            onChange={onEndDateChange}
            placeholder="Pick a date"
            className="text-sm"
            fromDate={pipEndBounds.fromDate}
            fromYear={pipEndBounds.fromYear}
            toYear={pipEndBounds.toYear}
          />
          {fieldErrors.endDate && (
            <p className="text-xs text-destructive" role="alert">{fieldErrors.endDate}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Objectives <span className="text-destructive" aria-hidden="true">*</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onAddObjective}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {fieldErrors.objectives && (
          <p className="text-xs text-destructive" role="alert">{fieldErrors.objectives}</p>
        )}
        <div className="space-y-3">
          {objectives.map((obj, idx) => (
            <div
              key={idx}
              className="space-y-2 p-3 border rounded-lg bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Objective {idx + 1}
                </span>
                {objectives.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => onRemoveObjective(idx)}
                    aria-label={`Remove objective ${idx + 1}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                placeholder="Goal / objective"
                aria-label={`Objective ${idx + 1}`}
                value={obj.objective}
                onChange={(e) => handleObjectiveChange(idx, e)}
                className="text-xs"
              />
              {fieldErrors[`objectives.${idx}.objective`] && (
                <p className="text-xs text-destructive" role="alert">
                  {fieldErrors[`objectives.${idx}.objective`]}
                </p>
              )}
              <Input
                placeholder="Success metric"
                aria-label={`Success metric for objective ${idx + 1}`}
                value={obj.metric}
                onChange={(e) => handleMetricChange(idx, e)}
                className="text-xs"
              />
              {fieldErrors[`objectives.${idx}.metric`] && (
                <p className="text-xs text-destructive">
                  {fieldErrors[`objectives.${idx}.metric`]}
                </p>
              )}
              <DatePicker
                value={obj.deadline ?? ""}
                onChange={(v) => handleDeadlineChange(idx, v)}
                placeholder="Pick a date"
                className="text-xs"
                fromDate={objectiveDeadlineBounds.fromDate}
                fromYear={objectiveDeadlineBounds.fromYear}
                toYear={objectiveDeadlineBounds.toYear}
                toDate={endDate ? new Date(`${endDate}T00:00:00`) : undefined}
              />
              {fieldErrors[`objectives.${idx}.deadline`] && (
                <p className="text-xs text-destructive">
                  {fieldErrors[`objectives.${idx}.deadline`]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <label htmlFor="pip-notes" className="text-sm font-medium">Notes (optional)</label>
        <Textarea
          id="pip-notes"
          placeholder="Additional context or manager notes..."
          value={notes}
          onChange={onNotesChange}
          rows={2}
          maxLength={2000}
        />
        {fieldErrors.notes && (
          <p className="text-xs text-destructive" role="alert">{fieldErrors.notes}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pip-manager-rating" className="text-sm font-medium">
          Manager Rating{" "}
          <span className="text-muted-foreground font-normal">
            (1–5, optional)
          </span>
        </label>
        <Input
          id="pip-manager-rating"
          type="number"
          min="1"
          max="5"
          step="1"
          placeholder="1–5"
          value={managerRating}
          onChange={onManagerRatingChange}
        />
      </div>
    </>
  );
}
