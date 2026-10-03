"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useFnfSuggestion } from "@/hooks/api/payroll/fnf";
import type { FnfSuggestion } from "@/hooks/api/payroll/fnf-schema";

interface FnfSuggestionPanelProps {
  userId: string;
  onApply: (suggestion: FnfSuggestion) => void;
}

export function FnfSuggestionPanel({ userId, onApply }: FnfSuggestionPanelProps) {
  const money = useOrgDisplay();
  const [lastWorkingDay, setLastWorkingDay] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading, isError, error } = useFnfSuggestion(userId, lastWorkingDay);

  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    setLastWorkingDay(event.target.value);
  }

  function handleApply() {
    if (data) onApply(data);
  }

  if (!userId) return null;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="fnf-last-working-day" className="text-sm font-medium text-foreground">
            Last working day
          </label>
          <Input id="fnf-last-working-day" type="date" value={lastWorkingDay} onChange={handleDateChange} />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleApply} disabled={!data}>
          Fill suggested amounts
        </Button>
      </div>
      {isLoading ? <Skeleton className="h-16 rounded-md" /> : null}
      {isError ? <p role="alert" className="text-xs text-destructive">{getErrorMessage(error)}</p> : null}
      {data ? (
        <div className="space-y-1 text-dense text-muted-foreground">
          <p>
            Service {data.serviceYears}y {data.serviceMonths}m
            {data.joiningDate ? ` from ${data.joiningDate}` : ""} · last drawn basic + DA{" "}
            <span className="tabular-nums text-foreground">
              {data.lastDrawnBasic ? formatMoney(data.lastDrawnBasic, money) : "unknown"}
            </span>
            {data.basicMonth ? ` (${data.basicMonth})` : ""}
          </p>
          <p>
            Gratuity: 15/26 × basic × {data.gratuityYears} years ={" "}
            <span className="tabular-nums text-foreground">{formatMoney(data.gratuity, money)}</span>
            {data.gratuityEligible ? "" : " (not eligible)"}
          </p>
          <p>
            Leave encashment: {data.encashableLeaveDays} days × basic/26 ={" "}
            <span className="tabular-nums text-foreground">{formatMoney(data.leaveEncashment, money)}</span>
          </p>
          {data.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <p>Drafts have no gratuity field yet, so filling adds gratuity to Notes and leaves it out of net payable.</p>
        </div>
      ) : null}
    </div>
  );
}
