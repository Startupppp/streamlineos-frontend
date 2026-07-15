"use client";

import { useCallback } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useOrgMembers } from "@/hooks/api/organization";
import { useSupportQueues } from "@/hooks/api/support/queues";
import type { SupportReportFilters } from "@/hooks/api/support/reports";

const CHANNEL_OPTIONS = ["email", "chat", "whatsapp", "sms"] as const;
const ALL_VALUE = "all";

interface ReportFiltersBarProps {
  filters: SupportReportFilters;
  onChange: (filters: SupportReportFilters) => void;
}

export function ReportFiltersBar({ filters, onChange }: ReportFiltersBarProps) {
  const membersQuery = useOrgMembers(1, 100);
  const queuesQuery = useSupportQueues();

  const members = membersQuery.data?.data ?? [];
  const queues = queuesQuery.data ?? [];

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      onChange({
        ...filters,
        dateFrom: range.from || undefined,
        dateTo: range.to || undefined,
      });
    },
    [filters, onChange],
  );

  const handleAgentChange = useCallback(
    (value: string) => {
      onChange({ ...filters, agentId: value === ALL_VALUE ? undefined : value });
    },
    [filters, onChange],
  );

  const handleQueueChange = useCallback(
    (value: string) => {
      onChange({ ...filters, queueId: value === ALL_VALUE ? undefined : Number(value) });
    },
    [filters, onChange],
  );

  const handleChannelChange = useCallback(
    (value: string) => {
      onChange({ ...filters, channel: value === ALL_VALUE ? undefined : value });
    },
    [filters, onChange],
  );

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <DateRangePicker
        from={filters.dateFrom}
        to={filters.dateTo}
        onChange={handleDateRangeChange}
        placeholder="All time"
        className="max-w-[220px]"
      />
      <Select value={filters.agentId ?? ALL_VALUE} onValueChange={handleAgentChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-40`}>
          <SelectValue placeholder="Agent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All agents</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.userId} value={m.userId}>
              {m.name ?? m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.queueId ? String(filters.queueId) : ALL_VALUE}
        onValueChange={handleQueueChange}
      >
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-40`}>
          <SelectValue placeholder="Queue" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All queues</SelectItem>
          {queues.map((q) => (
            <SelectItem key={q.id} value={String(q.id)}>
              {q.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.channel ?? ALL_VALUE} onValueChange={handleChannelChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-36`}>
          <SelectValue placeholder="Channel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All channels</SelectItem>
          {CHANNEL_OPTIONS.map((c) => (
            <SelectItem key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
