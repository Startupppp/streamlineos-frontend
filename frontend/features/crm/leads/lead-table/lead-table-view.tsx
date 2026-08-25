"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import {
  LeadTableViewProps, ALL_COLUMNS, PAGE_SIZES, getStoredColumns,
} from "./types";
import { useLeadCellRenderer } from "./lead-columns";
import { BulkActionsBar, ConversionModal, LostModal } from "./lead-actions";

interface ColumnToggleItemProps {
  col: { key: string; label: string };
  checked: boolean;
  onToggle: (key: string) => void;
}

function ColumnToggleItem({ col, checked, onToggle }: ColumnToggleItemProps) {
  const handleChange = useCallback(() => onToggle(col.key), [col.key, onToggle]);
  return (
    <DropdownMenuCheckboxItem checked={checked} onCheckedChange={handleChange} className="text-dense">
      {col.label}
    </DropdownMenuCheckboxItem>
  );
}

export function LeadTableView({
  leads, totalCount, page, pageSize,
  sortColumn, sortDirection, onSort, onPageChange, onPageSizeChange,
  onStatusChange, onPriorityChange, onAssign,
  onBulkUpdate, onBulkDelete, teamMembers,
  isLoading, canUpdate, canAssign, canDelete, canCreateDeal,
  canCreate, activeFilterLabels, onClearFilters, onCreateLead,
}: LeadTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ leadId: number; column: string } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(getStoredColumns);

  const [conversionModal, setConversionModal] = useState<{ leadId: number; leadName: string } | null>(null);
  const [lostModal, setLostModal] = useState<{ leadId: number; leadName: string } | null>(null);

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
    canUpdate,
    canAssign,
  });

  const fromRow = (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, totalCount);

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);

  const selectionProp = useMemo(() => ({
    selected: new Set<string | number>(selectedIds),
    onChange: (sel: Set<string | number>) => setSelectedIds(new Set([...sel].map(Number))),
  }), [selectedIds]);

  const columns: DataTableColumn<typeof leads[number]>[] = useMemo(
    () => cols.map((col) => ({
      key: col.key,
      header: col.label,
      sortable: col.sortable,
      cell: (row) => renderCell(row, col.key),
    })),
    [cols, renderCell],
  );

  const toolbar = (
    <div className="flex items-center justify-between w-full">
      <span className="text-dense text-muted-foreground tabular-nums">
        {totalCount > 0 ? `${fromRow}–${toRow} of ${totalCount}` : "0 leads"}
      </span>
      <div className="flex items-center gap-1.5">
        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="h-6 w-[70px] text-micro"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-dense">{s}/pg</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-micro px-2">
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
  );

  const isFiltered = activeFilterLabels.length > 0;

  const emptyState = isFiltered ? (
    <EmptyState
      illustration={<EmptyLeadsIllustration />}
      title="No leads match these filters"
      description={`Filtering by ${activeFilterLabels.join(", ")}. Clear the filters to see every lead.`}
      action={{ label: "Clear filters", onClick: onClearFilters }}
      actionVariant="outline"
      className="border-0 bg-transparent min-h-[40dvh]"
    />
  ) : (
    <EmptyState
      illustration={<EmptyLeadsIllustration />}
      title="No leads yet"
      description="Leads are the people and companies you are selling to. Add one by hand, or import a CSV to bring your existing list in."
      action={canCreate ? { label: "Add lead", onClick: onCreateLead } : undefined}
      className="border-0 bg-transparent min-h-[40dvh]"
    />
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="sm:hidden shrink-0 text-micro text-muted-foreground/70 px-1 pb-0.5">
        Swipe horizontally to see more columns
      </p>
      <DataTable
        data={leads}
        columns={columns}
        getRowKey={(row) => row.id}
        selection={selectionProp}
        pagination={{
          mode: "server",
          page,
          pageSize,
          total: totalCount,
          onPageChange,
          onPageSizeChange,
        }}
        sortState={{ field: sortColumn, direction: sortDirection, onChange: (field) => onSort(field) }}
        isLoading={isLoading}
        emptyState={emptyState}
        toolbar={toolbar}
        className="flex-1 min-h-0"
      />

      <BulkActionsBar
        selectedIds={selectedIds}
        selectedArray={selectedArray}
        leads={leads}
        teamMembers={teamMembers}
        canUpdate={canUpdate}
        canAssign={canAssign}
        canDelete={canDelete}
        onBulkUpdate={onBulkUpdate}
        onBulkDelete={onBulkDelete}
        onClearSelection={handleClearSelection}
      />

      <ConversionModal
        open={!!conversionModal}
        leadName={conversionModal?.leadName}
        onClose={handleConversionClose}
        onSubmit={handleConversionSubmit}
        canCreateDeal={canCreateDeal}
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
