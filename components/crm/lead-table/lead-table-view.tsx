"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns3, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LeadTableViewProps, ALL_COLUMNS, PAGE_SIZES, getStoredColumns,
} from "./types";
import { SortIcon, useLeadCellRenderer } from "./lead-columns";
import { BulkActionsBar, ConversionModal, LostModal } from "./lead-actions";

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

  /* ─── Conversion modal state ─── */
  const [conversionModal, setConversionModal] = useState<{ leadId: number; leadName: string } | null>(null);

  /* ─── Lost modal state ─── */
  const [lostModal, setLostModal] = useState<{ leadId: number; leadName: string } | null>(null);

  /* ─── Selection ─── */
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }, [leads, allSelected]);

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);

  /* ─── Column visibility ─── */
  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem("lead-table-columns", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const cols = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)),
    [visibleColumns],
  );

  /* ─── Status change — intercept CONVERTED / LOST ─── */
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

  /* ─── Cell renderer (hook) ─── */
  const renderCell = useLeadCellRenderer({
    editingCell,
    setEditingCell,
    teamMembers,
    onStatusChange: handleStatusChange,
    onPriorityChange,
    onAssign,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-1 pb-2">
        <span className="text-xs text-muted-foreground">{totalCount} leads</span>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-7 w-[80px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)} className="text-xs">{s} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                <Columns3 className="h-3.5 w-3.5 mr-1" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {ALL_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.has(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                  className="text-xs"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
        <div className="overflow-auto h-full w-full">
          <div className="min-w-max">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/60">
              <TableRow className="hover:bg-muted/60">
                <TableHead className="w-10 px-3">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                {cols.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-[11px] uppercase tracking-wider font-semibold px-3 py-2.5 whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:text-foreground",
                    )}
                    onClick={() => col.sortable && onSort(col.key)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {col.sortable && (
                        <SortIcon
                          column={col.key}
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={cols.length + 1} className="h-12">
                      <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={cols.length + 1}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead, idx) => (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      idx % 2 === 1 && "bg-muted/20",
                      selectedIds.has(lead.id) && "bg-gold/5",
                      "hover:bg-muted/40 transition-colors",
                    )}
                  >
                    <TableCell className="px-3">
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    {cols.map((col) => (
                      <TableCell key={col.key} className="px-3 py-2">
                        {renderCell(lead, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between pt-3 px-1">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={selectedIds}
        selectedArray={selectedArray}
        leads={leads}
        teamMembers={teamMembers}
        isAdmin={isAdmin}
        onBulkUpdate={onBulkUpdate}
        onBulkDelete={onBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Conversion Modal */}
      <ConversionModal
        open={!!conversionModal}
        leadName={conversionModal?.leadName}
        onClose={() => setConversionModal(null)}
        onSubmit={({ conversionNotes, investmentInterest, estimatedAmount }) => {
          if (!conversionModal) return;
          onStatusChange(conversionModal.leadId, "CONVERTED", {
            conversionNotes,
            investmentInterest,
            estimatedAmount,
          });
          setConversionModal(null);
        }}
      />

      {/* Lost Reason Modal */}
      <LostModal
        open={!!lostModal}
        leadName={lostModal?.leadName}
        onClose={() => setLostModal(null)}
        onSubmit={({ lostReason, lostNotes }) => {
          if (!lostModal) return;
          onStatusChange(lostModal.leadId, "LOST", { lostReason, lostNotes });
          setLostModal(null);
        }}
      />
    </div>
  );
}
