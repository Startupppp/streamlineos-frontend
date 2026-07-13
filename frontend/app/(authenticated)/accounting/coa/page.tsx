"use client";

import { useState, type ReactNode } from "react";
import { Plus, Calculator, LayoutTemplate, ChevronRight, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ListToolbar, ErrorState } from "@/components/shared";
import { useCoaTree, useSetupStatus, useDeactivateAccount, useActivateAccount, useDeleteAccount } from "@/hooks/api/accounting/core";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { CreateAccountDialog } from "@/features/accounting/create-account-dialog";
import { ApplyTemplateDialog } from "@/features/accounting/core/apply-template-dialog";
import { SetupProgressBanner } from "@/features/accounting/core/setup-progress-banner";
import type { AccountTreeNode } from "@/hooks/api/accounting/core";

type TypeFilter = "ALL" | "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

const TYPE_FILTER_VALUES: ReadonlyArray<string> = [
  "ALL",
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
];

function isTypeFilter(value: string): value is TypeFilter {
  return TYPE_FILTER_VALUES.includes(value);
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  ASSET: "border-blue-500/30 text-blue-700 bg-blue-500/5 dark:text-blue-300",
  LIABILITY: "border-orange-500/30 text-orange-700 bg-orange-500/5 dark:text-orange-300",
  EQUITY: "border-blue-500/30 text-blue-700 bg-blue-500/5 dark:text-blue-300",
  INCOME: "border-emerald-500/30 text-emerald-700 bg-emerald-500/5 dark:text-emerald-300",
  EXPENSE: "border-amber-500/30 text-amber-700 bg-amber-500/5 dark:text-amber-300",
};

interface FlatNode {
  node: AccountTreeNode;
  depth: number;
  hasChildren: boolean;
}

function flattenTree(
  nodes: AccountTreeNode[],
  expanded: Set<number>,
  depth: number,
  typeFilter: TypeFilter,
  search: string,
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    const matchesType = typeFilter === "ALL" || node.accountType === typeFilter;
    const matchesSearch =
      !search ||
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.code.toLowerCase().includes(search.toLowerCase());
    const hasChildren = node.children.length > 0;

    if (matchesType && matchesSearch) {
      result.push({ node, depth, hasChildren });
      if (hasChildren && expanded.has(node.id)) {
        result.push(...flattenTree(node.children, expanded, depth + 1, typeFilter, search));
      }
    } else if (hasChildren) {
      const childResults = flattenTree(node.children, expanded, depth + 1, typeFilter, search);
      if (childResults.length > 0) {
        result.push({ node, depth, hasChildren });
        if (expanded.has(node.id)) {
          result.push(...childResults);
        }
      }
    }
  }
  return result;
}

function initExpanded(nodes: AccountTreeNode[]): Set<number> {
  const ids = new Set<number>();
  for (const node of nodes) {
    ids.add(node.id);
  }
  return ids;
}

function countNodes(nodes: AccountTreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

interface CoaActionsCellProps {
  node: AccountTreeNode;
  onEdit: (node: AccountTreeNode) => void;
}

function CoaActionsCell({ node, onEdit }: CoaActionsCellProps) {
  const deactivate = useDeactivateAccount(node.id);
  const activate = useActivateAccount(node.id);
  const deleteAccount = useDeleteAccount(node.id);
  const isPending = deactivate.isPending || activate.isPending || deleteAccount.isPending;

  function handleEdit(): void {
    onEdit(node);
  }

  function handleToggleActive(): void {
    if (node.isActive) {
      deactivate.mutate(undefined, {
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      activate.mutate(undefined, {
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  }

  function handleDelete(): void {
    deleteAccount.mutate(undefined, {
      onSuccess: () => toast.success("Account deleted"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isPending}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleToggleActive} disabled={isPending}>
          <Power className="mr-2 h-3.5 w-3.5" />
          {node.isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        {!node.isSystem && !node.hasActivity && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildColumns(
  expanded: Set<number>,
  onToggle: (id: number) => void,
  onEdit: (node: AccountTreeNode) => void,
  canManage: boolean,
): DataTableColumn<FlatNode>[] {
  const cols: DataTableColumn<FlatNode>[] = [
    {
      key: "code",
      header: "Code",
      className: "w-[120px] font-mono text-xs",
      cell: ({ node }: FlatNode): ReactNode => node.code,
    },
    {
      key: "name",
      header: "Name",
      cell: ({ node, depth, hasChildren }: FlatNode): ReactNode => {
        function handleToggle(): void {
          onToggle(node.id);
        }
        const isExpanded = expanded.has(node.id);
        return (
          <div
            className="flex items-center gap-1.5 min-w-0"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleToggle}
              >
                <ChevronRight
                  className={cn("h-3.5 w-3.5 transition-transform duration-150", isExpanded && "rotate-90")}
                />
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className={cn("text-sm font-medium truncate", !node.isActive && "text-muted-foreground")}>
              {node.name}
            </span>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      className: "w-[140px]",
      cell: ({ node }: FlatNode): ReactNode => {
        const typeClass = TYPE_BADGE_CLASSES[node.accountType] ?? "border-border text-muted-foreground bg-muted";
        return (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeClass)}>
            {node.accountType}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "w-[100px]",
      cell: ({ node }: FlatNode): ReactNode => (
        <Badge variant={node.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
          {node.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  if (canManage) {
    cols.push({
      key: "actions",
      header: "",
      className: "w-[48px] text-right",
      cell: ({ node }: FlatNode): ReactNode => (
        <CoaActionsCell node={node} onEdit={onEdit} />
      ),
    });
  }

  return cols;
}

export default function ChartOfAccountsPage() {
  const canManage = useCan("accounting:accounts:manage");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [search, setSearch] = useState<string>("");
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [editAccount, setEditAccount] = useState<AccountTreeNode | null>(null);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedInitialized, setExpandedInitialized] = useState<boolean>(false);

  const query = useCoaTree();
  const setupQuery = useSetupStatus();

  const treeData = query.data?.items ?? [];
  countNodes(treeData);

  if (!expandedInitialized && treeData.length > 0) {
    setExpanded(initExpanded(treeData));
    setExpandedInitialized(true);
  }

  const flatNodes = flattenTree(treeData, expanded, 0, typeFilter, search);

  function handleTypeChange(value: string): void {
    if (isTypeFilter(value)) {
      setTypeFilter(value);
    }
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
  }

  function handleOpenCreate(): void {
    setEditAccount(null);
    setCreateOpen(true);
  }

  function handleCloseCreate(open: boolean): void {
    setCreateOpen(open);
    if (!open) setEditAccount(null);
  }

  function handleEditAccount(node: AccountTreeNode): void {
    setEditAccount(node);
    setCreateOpen(true);
  }

  function handleToggleNode(id: number): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleOpenApplyTemplate(): void {
    setApplyTemplateOpen(true);
  }

  const setupSteps = setupQuery.data?.steps ?? [];
  const hasIncompleteSetup = setupSteps.some((s) => !s.done);

  const columns = buildColumns(expanded, handleToggleNode, handleEditAccount, canManage);

  const emptyState = (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary mb-3">
        <Calculator className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">No accounts found</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
        {search || typeFilter !== "ALL"
          ? "Try a different filter or search term."
          : "Create your first ledger account or apply a template."}
      </p>
      <Button size="sm" className="mt-4" onClick={handleOpenCreate}>
        <Plus className="mr-2 h-4 w-4" />
        New account
      </Button>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Chart of Accounts"
      subtitle="Manage ledger accounts grouped by type."
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleOpenApplyTemplate}>
              <LayoutTemplate className="size-3.5 mr-1.5" />
              Apply template
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="size-3.5 mr-1.5" />
              New account
            </Button>
          </div>
        ) : undefined
      }
      filters={
        <div className="flex items-center gap-2">
          <ListToolbar
            search={search}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Search by code or name..."
          />
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="ASSET">Assets</SelectItem>
              <SelectItem value="LIABILITY">Liabilities</SelectItem>
              <SelectItem value="EQUITY">Equity</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-4">
        {hasIncompleteSetup && setupSteps.length > 0 && (
          <SetupProgressBanner steps={setupSteps} />
        )}

        {query.error ? (
          <ErrorState
            title="Failed to load accounts"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={flatNodes}
            columns={columns}
            getRowKey={({ node }) => node.id}
            isLoading={query.isLoading}
            emptyState={emptyState}
            minWidth="560px"
            rowClassName={({ node }) => cn(!node.isActive && "opacity-60")}
          />
        )}
      </div>

      <CreateAccountDialog
        key={editAccount?.id ?? "create"}
        open={createOpen}
        onOpenChange={handleCloseCreate}
        editAccount={editAccount}
      />
      <ApplyTemplateDialog open={applyTemplateOpen} onOpenChange={setApplyTemplateOpen} />
    </PageWrapper>
  );
}
