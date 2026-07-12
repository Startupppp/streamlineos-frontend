"use client";

import { useState } from "react";
import { Plus, Calculator, LayoutTemplate } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListToolbar, LoadingState, ErrorState } from "@/components/shared";
import { useCoaTree, useSetupStatus } from "@/hooks/api/accounting/core";
import { CreateAccountDialog } from "@/features/accounting/create-account-dialog";
import { CoaTreeRow } from "@/features/accounting/core/coa-tree-row";
import { ApplyTemplateDialog } from "@/features/accounting/core/apply-template-dialog";
import { SetupProgressBanner } from "@/features/accounting/core/setup-progress-banner";
import type { AccountTreeNode } from "@/hooks/api/accounting/core";

type TypeFilter = "ALL" | "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

const TYPE_FILTER_VALUES: ReadonlyArray<TypeFilter> = [
  "ALL",
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
];

function isTypeFilter(value: string): value is TypeFilter {
  return (TYPE_FILTER_VALUES as ReadonlyArray<string>).includes(value);
}

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

export default function ChartOfAccountsPage() {
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
  const totalCount = countNodes(treeData);

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

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Chart of Accounts"
      subtitle="Manage ledger accounts grouped by type."
      badge={totalCount > 0 ? `${totalCount}` : undefined}
      actions={
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

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load accounts"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : flatNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600 mb-3">
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
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Code
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Name
                    </TableHead>
                    <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Type
                    </TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Status
                    </TableHead>
                    <TableHead className="w-[48px] px-3 py-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flatNodes.map(({ node, depth, hasChildren }) => (
                    <CoaTreeRow
                      key={node.id}
                      node={node}
                      depth={depth}
                      isExpanded={expanded.has(node.id)}
                      hasChildren={hasChildren}
                      onToggle={handleToggleNode}
                      onEdit={handleEditAccount}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
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
