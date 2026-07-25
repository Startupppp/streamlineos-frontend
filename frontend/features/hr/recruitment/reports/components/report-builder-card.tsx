"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTITY_FIELDS, type ReportEntity } from "@/hooks/api";
import { ENTITY_OPTIONS } from "../lib/report-constants";
import { FieldCheckItem } from "./field-check-item";

interface ReportBuilderCardProps {
  entity: ReportEntity;
  selectedFields: string[];
  dateFrom: string;
  dateTo: string;
  isPending: boolean;
  onEntityChange: (v: string) => void;
  onFieldToggle: (field: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onGenerate: () => void;
}

export function ReportBuilderCard({
  entity,
  selectedFields,
  dateFrom,
  dateTo,
  isPending,
  onEntityChange,
  onFieldToggle,
  onDateFromChange,
  onDateToChange,
  onGenerate,
}: ReportBuilderCardProps) {
  const availableFields = ENTITY_FIELDS[entity];

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm">Report Builder</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Entity</Label>
          <Select value={entity} onValueChange={onEntityChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Fields (all if none selected)</Label>
          <div className="max-h-40 overflow-y-auto space-y-1.5 rounded border p-2">
            {availableFields.map((f) => (
              <FieldCheckItem
                key={f.value}
                field={f}
                isChecked={selectedFields.includes(f.value)}
                onToggle={onFieldToggle}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Date From</Label>
            <DatePicker value={dateFrom ?? ""} onChange={onDateFromChange} placeholder="Pick a date" className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date To</Label>
            <DatePicker value={dateTo ?? ""} onChange={onDateToChange} placeholder="Pick a date" className="text-xs" />
          </div>
        </div>

        <LoadingButton
          size="sm"
          className="w-full"
          onClick={onGenerate}
          isPending={isPending}
          loadingText="Generating..."
        >
          Generate Report
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
