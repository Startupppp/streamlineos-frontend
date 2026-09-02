"use client";

import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  useSettingsAuditLog,
  type SettingsAuditEntityType,
  type SettingsAuditLogEntry,
} from "@/hooks/api/support/settings-audit";
import { useOrgMembers } from "@/hooks/api/organization";

const ENTITY_TYPES: { value: SettingsAuditEntityType; label: string }[] = [
  { value: "sla_policy", label: "SLA Policy" },
  { value: "business_hours", label: "Business Hours" },
  { value: "automation", label: "Automation" },
  { value: "channel", label: "Channel" },
  { value: "custom_field", label: "Custom Field" },
  { value: "routing_rule", label: "Routing Rule" },
  { value: "agent_skill", label: "Agent Skill" },
  { value: "agent_availability", label: "Agent Availability" },
  { value: "vip_client", label: "VIP Client" },
];

function entityTypeLabel(type: string) {
  return ENTITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

function actionTone(action: string): "default" | "secondary" | "destructive" {
  if (action === "deleted") return "destructive";
  if (action === "created") return "default";
  return "secondary";
}

export function SupportSettingsAuditLogPage() {
  const [entityType, setEntityType] = useState<SettingsAuditEntityType | "all">("all");
  const { data, isLoading, isError, refetch } = useSettingsAuditLog(
    entityType === "all" ? undefined : entityType,
  );
  const membersQuery = useOrgMembers(1, 100);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of membersQuery.data?.data ?? []) {
      map.set(member.userId, member.name ?? member.email);
    }
    return map;
  }, [membersQuery.data]);

  const rows = data ?? [];

  function handleRetry() {
    void refetch();
  }

  function handleEntityTypeChange(value: string) {
    setEntityType(value as SettingsAuditEntityType | "all");
  }

  const columns: DataTableColumn<SettingsAuditLogEntry>[] = [
    {
      key: "createdAt",
      header: "When",
      cell: (row) => new Date(row.createdAt).toLocaleString(),
      sortable: true,
      sortValue: (row) => row.createdAt,
    },
    {
      key: "user",
      header: "Who",
      cell: (row) => (row.userId ? (nameByUserId.get(row.userId) ?? row.userId) : "System"),
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <Badge variant={actionTone(row.action)} className="text-micro capitalize">
          {row.action}
        </Badge>
      ),
    },
    {
      key: "entityType",
      header: "Type",
      cell: (row) => entityTypeLabel(row.entityType),
    },
    {
      key: "entityId",
      header: "ID",
      cell: (row) => <span className="font-mono text-xs">{row.entityId}</span>,
    },
  ];

  const emptyState = (
    <EmptyState
      illustrationPreset="report"
      title="No settings changes yet"
      description="SLA, automation, channel, and custom-field changes will show up here."
      compact
      className="min-h-[240px]"
    />
  );

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Every change to SLA policies, business hours, automations, channels, and custom fields."
      filters={
        <Select value={entityType} onValueChange={handleEntityTypeChange}>
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-[180px]`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {isError ? (
        <ErrorState title="Could not load the audit log" onRetry={handleRetry} />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={emptyState}
          pagination={{ pageSize: 50 }}
          minWidth="600px"
        />
      )}
    </PageWrapper>
  );
}
