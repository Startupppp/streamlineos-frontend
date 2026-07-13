"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useReminderPolicies,
  useReminderLog,
  useDeleteReminderPolicy,
} from "@/hooks/api/accounting/ar";
import type { ReminderPolicy, ReminderLogEntry } from "@/types/accounting/ar";
import { ReminderPolicyDialog } from "@/features/accounting/sales/reminder-policy-dialog";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function OffsetChips({ offsets }: { offsets: number[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {offsets.map((o) => (
        <Badge key={o} variant="outline" className="text-[9px] px-1.5 py-0 h-4">
          {o > 0 ? `+${o}d` : o === 0 ? "Due date" : `${o}d`}
        </Badge>
      ))}
    </div>
  );
}

interface PolicyRowActionsProps {
  policy: ReminderPolicy;
  onEdit: (policy: ReminderPolicy) => void;
  canManage: boolean;
}

function PolicyRowActions({ policy, onEdit, canManage }: PolicyRowActionsProps) {
  const deleteMutation = useDeleteReminderPolicy();

  function handleDelete(): void {
    deleteMutation.mutate(
      { policyId: policy.id },
      {
        onSuccess: () => toast.success("Policy deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleEdit(): void {
    onEdit(policy);
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <span className="sr-only">Actions</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {canManage && <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>}
          {canManage && <DropdownMenuSeparator />}
          {canManage && (
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete policy?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{policy.name}&rdquo; will be permanently deleted and reminders will stop sending.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PoliciesTabProps {
  canManage: boolean;
  dialogOpen: boolean;
  editPolicy: ReminderPolicy | undefined;
  onDialogOpenChange: (open: boolean) => void;
  onEdit: (policy: ReminderPolicy) => void;
  onNew: () => void;
}

function PoliciesTab({
  canManage,
  dialogOpen,
  editPolicy,
  onDialogOpenChange,
  onEdit,
  onNew,
}: PoliciesTabProps) {
  const [page, setPage] = useState(1);
  const query = useReminderPolicies({ page, pageSize: 20 });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  function handlePageChange(p: number): void {
    setPage(p);
  }

  const columns: DataTableColumn<ReminderPolicy>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
    },
    {
      key: "offsets",
      header: "Offsets",
      cell: (row) => <OffsetChips offsets={row.offsets} />,
    },
    {
      key: "channel",
      header: "Channel",
      cell: (row) => (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
          {row.channel}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border">
            Inactive
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <PolicyRowActions policy={row} onEdit={onEdit} canManage={canManage} />
      ),
      className: "w-10",
    },
  ];

  if (items.length === 0 && !query.isLoading) {
    return (
      <>
        <EmptyState
          illustrationPreset="automations"
          title="No reminder policies"
          description="Set up automated reminders to collect payments faster"
          action={canManage ? { label: "New Policy", onClick: onNew } : undefined}
        />
        <ReminderPolicyDialog
          open={dialogOpen}
          onOpenChange={onDialogOpenChange}
          policy={editPolicy}
        />
      </>
    );
  }

  return (
    <>
      <DataTable
        data={items}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={query.isLoading}
        pagination={{ mode: "server", page, pageSize: 20, total, onPageChange: handlePageChange }}
      />
      <ReminderPolicyDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        policy={editPolicy}
      />
    </>
  );
}

function LogTab() {
  const [page, setPage] = useState(1);
  const query = useReminderLog({ page, pageSize: 30 });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  function handlePageChange(p: number): void {
    setPage(p);
  }

  const columns: DataTableColumn<ReminderLogEntry>[] = [
    {
      key: "invoiceId",
      header: "Invoice",
      cell: (row) => (
        <Link
          href={`/accounting/invoices/${row.invoiceId}`}
          className="text-sm text-primary hover:underline font-mono"
        >
          #{row.invoiceId}
        </Link>
      ),
    },
    {
      key: "offsetDays",
      header: "Offset",
      cell: (row) => (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
          {row.offsetDays > 0 ? `+${row.offsetDays}d` : row.offsetDays === 0 ? "Due date" : `${row.offsetDays}d`}
        </Badge>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: (row) => (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
          {row.channel}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 py-0 h-4 ${
            row.status === "SENT"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
              : row.status === "FAILED"
                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
          }`}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "sentAt",
      header: "Sent at",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatDate(row.sentAt)}
        </span>
      ),
    },
  ];

  if (items.length === 0 && !query.isLoading) {
    return (
      <EmptyState
        compact
        title="No reminder logs yet"
        description="Reminder send history will appear here"
      />
    );
  }

  return (
    <DataTable
      data={items}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={query.isLoading}
      pagination={{ mode: "server", page, pageSize: 30, total, onPageChange: handlePageChange }}
    />
  );
}

export default function PaymentRemindersPage() {
  const [activeTab, setActiveTab] = useState("policies");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<ReminderPolicy | undefined>();
  const canManage = useCan("accounting:reminders:manage");

  function handleTabChange(value: string): void {
    setActiveTab(value);
  }

  function handleNewPolicy(): void {
    setEditPolicy(undefined);
    setDialogOpen(true);
  }

  function handleEditPolicy(policy: ReminderPolicy): void {
    setEditPolicy(policy.id === 0 ? undefined : policy);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean): void {
    setDialogOpen(open);
  }

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Payment Reminders"
      subtitle="Automated overdue reminders"
      actions={
        activeTab === "policies" && canManage ? (
          <Button size="sm" onClick={handleNewPolicy}>
            <Plus className="size-4 mr-1" />
            New Policy
          </Button>
        ) : undefined
      }
    >
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent value="policies">
          <PoliciesTab
            canManage={canManage}
            dialogOpen={dialogOpen}
            editPolicy={editPolicy}
            onDialogOpenChange={handleDialogOpenChange}
            onEdit={handleEditPolicy}
            onNew={handleNewPolicy}
          />
        </TabsContent>
        <TabsContent value="log">
          <LogTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
