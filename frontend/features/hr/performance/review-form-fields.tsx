"use client";

import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { AIGenerateReviewButton } from "@/features/hr/performance/ai-generate-review-button";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check } from "lucide-react";
import type { PerformanceReviewListItem, ReviewCycle, Employee } from "@/types/hr";

interface DateBounds {
  fromDate?: Date;
  fromYear?: number;
  toYear?: number;
}

interface ReviewFormFieldsProps {
  editReview: PerformanceReviewListItem | null;
  employees: Employee[];
  cycles: ReviewCycle[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  employeePickerOpen: boolean;
  onEmployeePickerOpenChange: (v: boolean) => void;
  cycleId: string;
  onCycleChange: (v: string) => void;
  periodStart: string;
  onPeriodStartChange: (v: string) => void;
  periodEnd: string;
  onPeriodEndChange: (v: string) => void;
  fieldErrors: Record<string, string>;
  periodStartBounds: DateBounds;
  periodEndBounds: DateBounds;
}

export function ReviewFormFields({
  editReview,
  employees,
  cycles,
  employeeId,
  onEmployeeChange,
  employeePickerOpen,
  onEmployeePickerOpenChange,
  cycleId,
  onCycleChange,
  periodStart,
  onPeriodStartChange,
  periodEnd,
  onPeriodEndChange,
  fieldErrors,
  periodStartBounds,
  periodEndBounds,
}: ReviewFormFieldsProps) {
  const selectedEmployee = employees.find((e) => e.id === employeeId);

  return (
    <>
      {!editReview && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Popover open={employeePickerOpen} onOpenChange={onEmployeePickerOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={employeePickerOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  fieldErrors.employeeId && "border-destructive",
                )}
              >
                <span className="truncate">
                  {selectedEmployee?.name ?? selectedEmployee?.email ?? "Select employee"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup>
                    {employees.map((e) => (
                      <CommandItem
                        key={e.id}
                        value={`${e.name ?? ""} ${e.email}`}
                        onSelect={() => {
                          onEmployeeChange(e.id);
                          onEmployeePickerOpenChange(false);
                        }}
                      >
                        <Check
                          className={cn("mr-2 h-4 w-4", employeeId === e.id ? "opacity-100" : "opacity-0")}
                        />
                        {e.name ?? e.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {fieldErrors.employeeId && (
            <p className="text-xs text-destructive">{fieldErrors.employeeId}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Review Cycle (optional)</label>
        <Select value={cycleId} onValueChange={onCycleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Ad-hoc review" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="none">Ad-hoc (no cycle)</SelectItem>
            {(Array.isArray(cycles) ? cycles : [])
              .filter(
                (c: ReviewCycle) =>
                  c.id != null &&
                  String(c.id) !== "" &&
                  c.name &&
                  c.status !== "COMPLETED" &&
                  c.status !== "CANCELLED",
              )
              .map((c: ReviewCycle) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  <span className="truncate max-w-[200px] block">{c.name}</span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Period Start</label>
          <DatePicker
            value={periodStart ?? ""}
            onChange={onPeriodStartChange}
            placeholder="Pick a date"
            className="text-sm"
            fromDate={periodStartBounds.fromDate}
            fromYear={periodStartBounds.fromYear}
            toYear={periodStartBounds.toYear}
          />
          {fieldErrors.periodStart && (
            <p className="text-xs text-destructive">{fieldErrors.periodStart}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Period End</label>
          <DatePicker
            value={periodEnd ?? ""}
            onChange={onPeriodEndChange}
            placeholder="Pick a date"
            className="text-sm"
            fromDate={periodEndBounds.fromDate}
            fromYear={periodEndBounds.fromYear}
            toYear={periodEndBounds.toYear}
          />
          {fieldErrors.periodEnd && (
            <p className="text-xs text-destructive">{fieldErrors.periodEnd}</p>
          )}
        </div>
      </div>

      {employeeId && periodStart && periodEnd && (
        <div className="pt-2 border-t border-border">
          <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-2">
            AI Assist
          </p>
          <AIGenerateReviewButton
            userId={employeeId}
            userName={selectedEmployee?.name ?? "Employee"}
            periodStart={periodStart}
            periodEnd={periodEnd}
          />
        </div>
      )}
    </>
  );
}
