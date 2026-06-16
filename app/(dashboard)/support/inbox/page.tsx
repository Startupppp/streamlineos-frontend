"use client";

import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSupportTickets, useSupportStats } from "@/lib/api/hooks/support";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { SupportTicketStatus, SupportTicketPriority } from "@/types/support";
import { TicketList } from "@/features/support/inbox/ticket-list";
import { TicketDetailSheet } from "@/features/support/inbox/ticket-detail-sheet";
import { CreateTicketDialog } from "@/features/support/inbox/create-ticket-dialog";

export default function SupportInboxPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "CUSTOMER_SUPPORT"]}>
      <InboxContent />
    </DashboardGate>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = searchParams.get("status") || "all";
  const priorityFilter = searchParams.get("priority") || "all";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete(key);
      else params.set(key, value);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname]
  );

  const { data: ticketsData, isLoading } = useSupportTickets({
    ...(statusFilter !== "all" ? { status: statusFilter as SupportTicketStatus } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter as SupportTicketPriority } : {}),
  });
  const { data: stats, isLoading: statsLoading } = useSupportStats();

  const tickets = ticketsData?.items ?? [];

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleStatusFilter = useCallback(
    (v: string) => updateFilter("status", v),
    [updateFilter]
  );
  const handlePriorityFilter = useCallback(
    (v: string) => updateFilter("priority", v),
    [updateFilter]
  );
  const handleBackFromTicket = useCallback(() => setSelectedTicketId(null), []);

  return (
    <>
      <PageWrapper
        title="Support Inbox"
        subtitle={
          statsLoading
            ? "Loading..."
            : `${(stats?.open ?? 0) + (stats?.in_progress ?? 0)} active tickets${
                (stats?.sla_breached ?? 0) > 0
                  ? ` · ${stats?.sla_breached} SLA breached`
                  : ""
              }`
        }
        actions={
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Ticket
          </Button>
        }
        filters={
          <>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
              <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        noInternalScroll
        contentClassName="flex overflow-hidden !py-0 !px-0"
      >
        <TicketList
          tickets={tickets}
          isLoading={isLoading}
          selectedTicketId={selectedTicketId}
          onSelect={setSelectedTicketId}
        />

        <div className={cn("flex-1 flex flex-col", !selectedTicketId && "hidden md:flex")}>
          {selectedTicketId ? (
            <TicketDetailSheet ticketId={selectedTicketId} onBack={handleBackFromTicket} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <EmptyTicketIllustration className="mx-auto mb-3 w-40 h-40" />
                <p className="text-sm font-medium text-foreground">Select a ticket</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a ticket from the list to view its details
                </p>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
