"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { formatShortDate } from "@/lib/date-utils";

function OffsetChips({ offsets }: { offsets: number[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {offsets.map((o) => (
        <Badge key={o} variant="outline" className="text-micro px-1.5 py-0 h-4">
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

  function handlePreventClose(e: Event): void {
    e.preventDefault();
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="icon" className="w-7" aria-label="Policy actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {canManage && <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>}
          {canManage && <DropdownMenuSeparator />}
          {canManage && (
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={handlePreventClose}
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
  const query = useReminderPolicies({ limit: 100 });
  const items = query.data?.items ?? [];

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
        <Badge variant="outline" className="text-micro px-1.5 py-0 h-4">
          {row.channel}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge variant="outline" className="text-micro px-1.5 py-0 h-4 bg-status-success-surface text-status-success-ink border-status-success-rule">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-micro px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border">
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
      <div className="flex flex-1 min-h-0 flex-col">
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
      </div>
    );
  }

  return (
    <>
      <DataTable
        className="flex-1 min-h-0"
        data={items}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={query.isLoading}
        pagination={{ pageSize: 20 }}
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
  const query = useReminderLog({ limit: 100 });
  const items = query.data?.items ?? [];

  const columns: DataTableColumn<ReminderLogEntry>[] = [
    {
      key: "invoiceId",
      header: "Invoice",
      cell: (row) => (
        <Link
          href={`/accounting/invoices/${row.invoiceId}`}
          className="text-sm text-primary hover:underline font-mono"
        >
          View invoice
        </Link>
      ),
    },
    {
      key: "offsetDays",
      header: "Offset",
      cell: (row) => (
        <Badge variant="outline" className="text-micro px-1.5 py-0 h-4">
          {row.offsetDays > 0 ? `+${row.offsetDays}d` : row.offsetDays === 0 ? "Due date" : `${row.offsetDays}d`}
        </Badge>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: (row) => (
        <Badge variant="outline" className="text-micro px-1.5 py-0 h-4">
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
          className={`text-micro px-1.5 py-0 h-4 ${
            row.status === "SENT"
              ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
              : row.status === "FAILED"
                ? "bg-status-danger-surface text-status-danger-ink border-status-danger-rule"
                : "bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
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
          {formatShortDate(row.sentAt) || "—"}
        </span>
      ),
    },
  ];

  if (items.length === 0 && !query.isLoading) {
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <EmptyState
          compact
          title="No reminder logs yet"
          description="Reminder send history will appear here"
        />
      </div>
    );
  }

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={items}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={query.isLoading}
      pagination={{ pageSize: 30 }}
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
      title="Payment Reminders"
      subtitle="Automated overdue reminders"
      actions={
        activeTab === "policies" && canManage ? (
          <LoadingButton size="sm" onClick={handleNewPolicy} isPending={false}>
            <Plus className="size-4 mr-1" />
            New Policy
          </LoadingButton>
        ) : undefined
      }
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent value="policies" className="flex flex-1 min-h-0 flex-col mt-0">
          <PoliciesTab
            canManage={canManage}
            dialogOpen={dialogOpen}
            editPolicy={editPolicy}
            onDialogOpenChange={handleDialogOpenChange}
            onEdit={handleEditPolicy}
            onNew={handleNewPolicy}
          />
        </TabsContent>
        <TabsContent value="log" className="flex flex-1 min-h-0 flex-col mt-0">
          <LogTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
