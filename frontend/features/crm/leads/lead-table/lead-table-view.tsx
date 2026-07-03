"use client";

import { useState, useMemo, useCallback } from "react";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  LeadTableViewProps, ALL_COLUMNS, PAGE_SIZES, getStoredColumns,
} from "./types";
import { SortIcon, useLeadCellRenderer } from "./lead-columns";
import { BulkActionsBar, ConversionModal, LostModal } from "./lead-actions";

interface SortableHeadProps {
  col: { key: string; label: string; sortable: boolean };
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
}

function SortableHead({ col, sortColumn, sortDirection, onSort }: SortableHeadProps) {
  const handleClick = useCallback(() => { if (col.sortable) onSort(col.key); }, [col.key, col.sortable, onSort]);
  return (
    <TableHead
      className={cn(
        "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 whitespace-nowrap",
        col.sortable && "cursor-pointer select-none hover:text-foreground",
      )}
      onClick={handleClick}
    >
      <span className="flex items-center">
        {col.label}
        {col.sortable && (
          <SortIcon column={col.key} sortColumn={sortColumn} sortDirection={sortDirection} />
        )}
      </span>
    </TableHead>
  );
}

interface ColumnToggleItemProps {
  col: { key: string; label: string };
  checked: boolean;
  onToggle: (key: string) => void;
}

function ColumnToggleItem({ col, checked, onToggle }: ColumnToggleItemProps) {
  const handleChange = useCallback(() => onToggle(col.key), [col.key, onToggle]);
  return (
    <DropdownMenuCheckboxItem checked={checked} onCheckedChange={handleChange} className="text-[11px]">
      {col.label}
    </DropdownMenuCheckboxItem>
  );
}

interface LeadSelectCheckboxProps {
  leadId: number;
  checked: boolean;
  onToggle: (id: number) => void;
}

function LeadSelectCheckbox({ leadId, checked, onToggle }: LeadSelectCheckboxProps) {
  const handleChange = useCallback(() => onToggle(leadId), [leadId, onToggle]);
  return <Checkbox checked={checked} onCheckedChange={handleChange} className="h-3.5 w-3.5" />;
}

export function LeadTableView({
  leads, totalCount, page, totalPages, pageSize,
  sortColumn, sortDirection, onSort, onPageChange, onPageSizeChange,
  onStatusChange, onPriorityChange, onAssign,
  onBulkUpdate, onBulkDelete, teamMembers,
  isLoading, isAdmin,
}: LeadTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ leadId: number; column: string } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(getStoredColumns);

  const [conversionModal, setConversionModal] = useState<{ leadId: number; leadName: string } | null>(null);
  const [lostModal, setLostModal] = useState<{ leadId: number; leadName: string } | null>(null);

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }, [leads, allSelected]);

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      localStorage.setItem("lead-table-columns", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const cols = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)),
    [visibleColumns],
  );

  const handleStatusChange = useCallback(
    (leadId: number, newStatus: string, leadName: string) => {
      if (newStatus === "CONVERTED") {
        setConversionModal({ leadId, leadName });
        return;
      }
      if (newStatus === "LOST") {
        setLostModal({ leadId, leadName });
        return;
      }
      onStatusChange(leadId, newStatus);
    },
    [onStatusChange],
  );

  const handlePageSizeChange = useCallback((v: string) => onPageSizeChange(Number(v)), [onPageSizeChange]);
  const handlePrevPage = useCallback(() => onPageChange(page - 1), [onPageChange, page]);
  const handleNextPage = useCallback(() => onPageChange(page + 1), [onPageChange, page]);
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleConversionClose = useCallback(() => setConversionModal(null), []);
  const handleLostClose = useCallback(() => setLostModal(null), []);

  const handleConversionSubmit = useCallback(({ conversionNotes, investmentInterest, estimatedAmount }: {
    conversionNotes: string;
    investmentInterest: string;
    estimatedAmount: string;
    createDeal: boolean;
    dealName: string;
  }) => {
    if (!conversionModal) return;
    onStatusChange(conversionModal.leadId, "CONVERTED", { conversionNotes, investmentInterest, estimatedAmount });
    setConversionModal(null);
  }, [conversionModal, onStatusChange]);

  const handleLostSubmit = useCallback(({ lostReason, lostNotes }: { lostReason: string; lostNotes: string }) => {
    if (!lostModal) return;
    onStatusChange(lostModal.leadId, "LOST", { lostReason, lostNotes });
    setLostModal(null);
  }, [lostModal, onStatusChange]);

  const renderCell = useLeadCellRenderer({
    editingCell,
    setEditingCell,
    teamMembers,
    onStatusChange: handleStatusChange,
    onPriorityChange,
    onAssign,
  });

  const fromRow = (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between px-1 pb-0.5">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {totalCount > 0 ? `${fromRow}–${toRow} of ${totalCount}` : "0 leads"}
        </span>
        <div className="flex items-center gap-1.5">
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-6 w-[70px] text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)} className="text-[11px]">{s}/pg</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                <Columns3 className="h-3 w-3 mr-1" />Cols
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 max-h-80 overflow-y-auto">
              {ALL_COLUMNS.map((col) => (
                <ColumnToggleItem
                  key={col.key}
                  col={col}
                  checked={visibleColumns.has(col.key)}
                  onToggle={toggleColumn}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="sm:hidden shrink-0 text-[10px] text-muted-foreground/70 px-1 pb-0.5">
        Swipe horizontally to see more columns
      </p>
      <div className="flex-1 min-h-0 border border-border rounded-md overflow-auto">
        <div className="min-w-max">
          <table className="w-full caption-bottom text-[11px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow className="hover:bg-muted/80 border-b-2 border-border">
                <TableHead className="w-8 px-2 py-1.5">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="h-3.5 w-3.5" />
                </TableHead>
                {cols.map((col) => (
                  <SortableHead
                    key={col.key}
                    col={col}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={onSort}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="h-8">
                    <TableCell className="px-2 py-1">
                      <Skeleton className="h-3 w-3.5" />
                    </TableCell>
                    {cols.map((col) => (
                      <TableCell key={col.key} className="px-2 py-1">
                        <Skeleton className="h-3 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cols.length + 1} className="p-0">
                    <EmptyState
                      illustration={<Users className="h-8 w-8 text-muted-foreground/40" />}
                      title="No leads found"
                      description="No leads match your current filters."
                      className="border-0 bg-transparent min-h-[40vh]"
                      compact
                    />
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead, idx) => (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      "h-8",
                      idx % 2 === 1 && "bg-muted/10",
                      selectedIds.has(lead.id) && "bg-blue-500/5 hover:bg-blue-500/10",
                      "hover:bg-muted/30 transition-colors",
                    )}
                  >
                    <TableCell className="px-2 py-1">
                      <LeadSelectCheckbox
                        leadId={lead.id}
                        checked={selectedIds.has(lead.id)}
                        onToggle={toggleSelect}
                      />
                    </TableCell>
                    {cols.map((col) => (
                      <TableCell key={col.key} className="px-2 py-1">
                        {renderCell(lead, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between pt-0.5 px-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            Page {page}/{totalPages}
          </span>
          <div className="flex items-center gap-0.5">
            <Button variant="outline" size="sm" className="h-6 w-6 p-0" disabled={page <= 1} onClick={handlePrevPage}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0" disabled={page >= totalPages} onClick={handleNextPage}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <BulkActionsBar
        selectedIds={selectedIds}
        selectedArray={selectedArray}
        leads={leads}
        teamMembers={teamMembers}
        isAdmin={isAdmin}
        onBulkUpdate={onBulkUpdate}
        onBulkDelete={onBulkDelete}
        onClearSelection={handleClearSelection}
      />

      <ConversionModal
        open={!!conversionModal}
        leadName={conversionModal?.leadName}
        onClose={handleConversionClose}
        onSubmit={handleConversionSubmit}
      />

      <LostModal
        open={!!lostModal}
        leadName={lostModal?.leadName}
        onClose={handleLostClose}
        onSubmit={handleLostSubmit}
      />
    </div>
  );
}
