"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Plus, AlertTriangle } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import {
  useEmergencyEvents,
  type EmergencyEvent,
  type EmergencyEventStatus,
} from "@/hooks/api/hr/enterprise-ops-emergency";
import { EmergencyEventSheet } from "./emergency-event-sheet";
import { EmergencyEventDetail } from "./emergency-event-detail";
import { format } from "date-fns";

const STATUS_COLORS: Record<EmergencyEventStatus, string> = {
  active: "bg-red-50 text-red-700 border-red-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function EmergencyPageContent() {
  const canManage = useCan("hr:emergency:manage");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useEmergencyEvents({ page });

  const columns: DataTableColumn<EmergencyEvent>[] = [
    {
      key: "name",
      header: "Event",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm font-medium text-foreground">{r.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <span className="text-sm text-muted-foreground capitalize">
          {r.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[r.status]}`}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(r.createdAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
  ];

  if (selectedId) {
    return <EmergencyEventDetail eventId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <>
      <PageWrapper
        title="Emergency Management"
        subtitle="Declare emergency events and track employee safety responses"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Declare Event
            </Button>
          ) : null
        }
      >
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          getRowKey={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          isLoading={isLoading}
          emptyState={<p className="text-sm text-muted-foreground text-center py-8">No emergency events</p>}
          pagination={
            data
              ? {
                  mode: "server",
                  page,
                  pageSize: data.pagination.limit,
                  total: data.pagination.total,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </PageWrapper>

      <EmergencyEventSheet open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
