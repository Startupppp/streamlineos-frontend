"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, ExternalLink, BookOpen } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EntityFormDialog } from "@/components/shared";
import { LoadingState, ErrorState } from "@/components/shared";
import {
  useAccounts,
  useJournal,
  useUpdateAccount,
} from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  AccountType,
  Account,
  JournalEntry,
  JournalEntryStatus,
} from "@/types/accounting";

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>;
}

const TYPE_BADGE_CLASSES: Record<AccountType, string> = {
  ASSET: "border-blue-500/30 text-blue-700 bg-blue-500/5",
  LIABILITY: "border-amber-500/30 text-amber-700 bg-amber-500/5",
  EQUITY: "border-purple-500/30 text-purple-700 bg-purple-500/5",
  INCOME: "border-emerald-500/30 text-emerald-700 bg-emerald-500/5",
  EXPENSE: "border-red-500/30 text-red-700 bg-red-500/5",
};

const STATUS_VARIANT: Record<
  JournalEntryStatus,
  "default" | "secondary" | "destructive"
> = {
  POSTED: "default",
  DRAFT: "secondary",
  VOID: "destructive",
  PENDING_APPROVAL: "secondary",
};

const editAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional(),
  isActive: z.boolean(),
});

type EditAccountValues = z.infer<typeof editAccountSchema>;

function formatDate(value: string | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

interface EditAccountDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: EditAccountDialogProps) {
  const update = useUpdateAccount(account.id);

  const defaultValues: EditAccountValues = {
    name: account.name,
    description: account.description ?? "",
    isActive: account.isActive,
  };

  async function handleSubmit(values: EditAccountValues): Promise<void> {
    try {
      await update.mutateAsync({
        name: values.name,
        description: values.description ? values.description : undefined,
        isActive: values.isActive,
      });
      toast.success("Account updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <EntityFormDialog<EditAccountValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Edit account"
      resolver={zodResolver(editAccountSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={update.isPending}
      submitLabel="Save changes"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Account name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                    placeholder="Optional notes about this account"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <FormLabel className="text-sm font-medium">Active</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inactive accounts are hidden from transaction forms.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { accountId: accountIdStr } = use(params);
  const accountId = Number.parseInt(accountIdStr, 10);

  const [editOpen, setEditOpen] = useState(false);

  const accountsQuery = useAccounts({ page: 1, pageSize: 500 });
  const journalQuery = useJournal({ pageSize: 20 });

  const account = Number.isInteger(accountId)
    ? accountsQuery.data?.items.find((item) => item.id === accountId)
    : undefined;

  const parentAccount = account?.parentAccountId
    ? accountsQuery.data?.items.find(
        (item) => item.id === account.parentAccountId,
      )
    : undefined;

  const handleOpenEdit = useCallback(() => {
    setEditOpen(true);
  }, []);

  const handleEditOpenChange = useCallback((open: boolean) => {
    setEditOpen(open);
  }, []);

  const handleRetry = useCallback(() => {
    void accountsQuery.refetch();
    void journalQuery.refetch();
  }, [accountsQuery, journalQuery]);

  const journalEntries = journalQuery.data?.items ?? [];

  const journalColumns: DataTableColumn<JournalEntry>[] = [
    {
      key: "entryNumber",
      header: "Entry #",
      cell: (entry) => (
        <span className="font-mono text-xs text-foreground">
          {entry.entryNumber}
        </span>
      ),
    },
    {
      key: "entryDate",
      header: "Date",
      cell: (entry) => (
        <span className="text-sm text-foreground tabular-nums">
          {formatDate(entry.entryDate)}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-[280px] truncate",
      cell: (entry) => (
        <span className="text-sm text-muted-foreground">
          {entry.description ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (entry) => (
        <Badge variant={STATUS_VARIANT[entry.status]}>{entry.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[60px] text-right",
      cell: (entry) => (
        <Link
          href={`/accounting/journal/${entry.id}`}
          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <PageWrapper
      eyebrow="Accounting · Chart of Accounts"
      title={account ? account.name : "Account"}
      subtitle={account ? `Code ${account.code}` : "Loading account details…"}
      actions={
        <div className="flex items-center gap-2">
          {account && (
            <Button variant="outline" size="sm" onClick={handleOpenEdit}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounting/coa">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Chart of accounts
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {accountsQuery.isLoading ? (
          <LoadingState variant="form" rows={5} />
        ) : accountsQuery.error ? (
          <ErrorState
            title="Failed to load account"
            description={getErrorMessage(accountsQuery.error)}
            onRetry={handleRetry}
          />
        ) : !account || !Number.isInteger(accountId) ? (
          <div className="flex flex-1 h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-16 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              Account not found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              This account does not exist or you do not have access to it.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/accounting/coa">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to chart of accounts
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground leading-none uppercase tracking-wide">
                      Code
                    </p>
                    <p className="mt-1.5 text-sm font-mono text-foreground">
                      {account.code}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground leading-none uppercase tracking-wide">
                      Type
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-1.5 ${TYPE_BADGE_CLASSES[account.accountType]}`}
                    >
                      {account.accountType}
                    </Badge>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground leading-none uppercase tracking-wide">
                      Status
                    </p>
                    <Badge
                      variant={account.isActive ? "default" : "secondary"}
                      className="mt-1.5"
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {parentAccount && (
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-muted-foreground leading-none uppercase tracking-wide">
                        Parent account
                      </p>
                      <Link
                        href={`/accounting/coa/${parentAccount.id}`}
                        className="mt-1.5 flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {parentAccount.code}
                        </span>
                        <span>{parentAccount.name}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground leading-none uppercase tracking-wide">
                      Created
                    </p>
                    <p className="mt-1.5 text-sm text-foreground">
                      {formatDate(account.createdAt)}
                    </p>
                  </div>
                </div>

                {account.description && (
                  <div className="pt-4 border-t border-border/60">
                    <p className="text-[11px] font-medium text-muted-foreground leading-none uppercase tracking-wide">
                      Description
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {account.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-5 py-4 pb-0">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Recent journal activity
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recent activity across all accounts
                </p>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                {journalQuery.isLoading ? (
                  <div className="px-5 pb-5">
                    <LoadingState variant="table" rows={5} />
                  </div>
                ) : journalQuery.error ? (
                  <div className="px-5 pb-5">
                    <ErrorState
                      compact
                      title="Failed to load journal entries"
                      description={getErrorMessage(journalQuery.error)}
                      onRetry={handleRetry}
                    />
                  </div>
                ) : journalEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No journal entries yet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      asChild
                    >
                      <Link href="/accounting/journal/new">New entry</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="px-0">
                    <DataTable
                      data={journalEntries}
                      columns={journalColumns}
                      getRowKey={(row) => row.id}
                      minWidth="560px"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {account && (
        <EditAccountDialog
          account={account}
          open={editOpen}
          onOpenChange={handleEditOpenChange}
        />
      )}
    </PageWrapper>
  );
}
