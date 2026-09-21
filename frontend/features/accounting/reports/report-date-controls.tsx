"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { LabelModeToggle } from "./label-mode-toggle";
import type { LabelMode } from "@/types/accounting/accounting-reports";

interface AsOfControlsProps {
  asOf: string;
  onAsOfChange: (value: string) => void;
  labelMode: LabelMode;
  onLabelModeChange: (mode: LabelMode) => void;
  extra?: React.ReactNode;
}

export function AsOfControls({
  asOf,
  onAsOfChange,
  labelMode,
  onLabelModeChange,
  extra,
}: AsOfControlsProps) {
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-label font-medium text-muted-foreground">
          As of
        </span>
        <DatePicker
          value={asOf}
          onChange={onAsOfChange}
          className="w-[11rem]"
        />
      </div>
      {extra}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <LabelModeToggle value={labelMode} onValueChange={onLabelModeChange} />
      </div>
    </div>
  );
}

interface RangeControlsProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  labelMode: LabelMode;
  onLabelModeChange: (mode: LabelMode) => void;
  extra?: React.ReactNode;
}

export function RangeControls({
  from,
  to,
  onFromChange,
  onToChange,
  labelMode,
  onLabelModeChange,
  extra,
}: RangeControlsProps) {
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-label font-medium text-muted-foreground">
          From
        </span>
        <DatePicker
          value={from}
          onChange={onFromChange}
          className="w-[11rem]"
        />
        <span className="text-label font-medium text-muted-foreground">to</span>
        <DatePicker value={to} onChange={onToChange} className="w-[11rem]" />
      </div>
      {extra}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <LabelModeToggle value={labelMode} onValueChange={onLabelModeChange} />
      </div>
    </div>
  );
}
