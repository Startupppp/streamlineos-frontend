"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpDown, ArrowUp, ArrowDown, Columns3,
  Trash2, ChevronLeft, ChevronRight,
  Download, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface Lead {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  company?: string | null;
  source?: string | null;
  status: string;
  priority?: string | null;
  potentialValue?: string | null;
  score?: number | null;
  city?: string | null;
  tags?: string[] | null;
  slaDeadline?: string | Date | null;
  createdAt?: string | Date | null;
  assignedTo?: { id?: string; name?: string | null; image?: string | null } | null;
}

interface TeamMember {
  id: string;
  name: string | null;
  image?: string | null;
}

interface LeadTableViewProps {
  leads: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onStatusChange: (leadId: number, newStatus: string, extra?: { conversionNotes?: string; investmentInterest?: string; estimatedAmount?: string; lostReason?: string; lostNotes?: string }) => void;
  onPriorityChange: (leadId: number, newPriority: string) => void;
  onAssign: (leadId: number, userId: string) => void;
  onBulkUpdate: (leadIds: number[], update: { status?: string; priority?: string; assignedToId?: string }) => void;
  onBulkDelete: (leadIds: number[]) => void;
  teamMembers: TeamMember[];
  isLoading: boolean;
  isAdmin: boolean;
}

/* ─── Constants ─── */
const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"];
const PRIORITIES = ["HOT", "WARM", "COLD"];
const PAGE_SIZES = [25, 50, 100];

const LOST_REASONS = [
  "Not interested",
  "Budget constraints",
  "Chose competitor",
  "No response",
  "Bad timing",
  "Invalid lead",
  "Duplicate",
  "Other",
];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CONTACTED: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  INTERESTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  QUALIFIED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  CONVERTED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  LOST: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  HOT: "bg-red-500/15 text-red-400 border-red-500/20",
  WARM: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  COLD: "bg-blue-400/15 text-blue-400 border-blue-400/20",
};

const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-green-500/10 text-green-400", campaign: "bg-indigo-500/10 text-indigo-400",
  cold_call: "bg-orange-500/10 text-orange-400", website: "bg-blue-500/10 text-blue-400",
  social_media: "bg-purple-500/10 text-purple-400", walk_in: "bg-teal-500/10 text-teal-400",
  other: "bg-gray-500/10 text-gray-400",
};

const ALL_COLUMNS = [
  { key: "name", label: "Name", defaultVisible: true, sortable: true },
  { key: "email", label: "Email", defaultVisible: true, sortable: true },
  { key: "phone", label: "Phone", defaultVisible: true, sortable: false },
  { key: "whatsapp", label: "WhatsApp", defaultVisible: false, sortable: false },
  { key: "company", label: "Company", defaultVisible: false, sortable: true },
  { key: "source", label: "Source", defaultVisible: true, sortable: true },
  { key: "status", label: "Status", defaultVisible: true, sortable: true },
  { key: "priority", label: "Priority", defaultVisible: true, sortable: true },
  { key: "assignedTo", label: "Assigned To", defaultVisible: true, sortable: false },
  { key: "score", label: "Score", defaultVisible: false, sortable: true },
  { key: "potentialValue", label: "Value", defaultVisible: true, sortable: true },
  { key: "city", label: "City", defaultVisible: false, sortable: false },
  { key: "tags", label: "Tags", defaultVisible: false, sortable: false },
  { key: "sla", label: "SLA", defaultVisible: false, sortable: false },
  { key: "createdAt", label: "Created", defaultVisible: true, sortable: true },
];

const DEFAULT_VISIBLE = new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));

function getStoredColumns(): Set<string> {
  if (typeof window === "undefined") return DEFAULT_VISIBLE;
  const saved = localStorage.getItem("lead-table-columns");
  return saved ? new Set(JSON.parse(saved)) : DEFAULT_VISIBLE;
}

/* ─── Helpers ─── */
function formatINR(val: string | number | null | undefined): string {
  if (!val) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

/* ─── Component ─── */
export function LeadTableView({
  leads, totalCount, page, totalPages, pageSize,
  sortColumn, sortDirection, onSort, onPageChange, onPageSizeChange,
  onStatusChange, onPriorityChange, onAssign,
  onBulkUpdate, onBulkDelete, teamMembers,
  isLoading, isAdmin,
}: LeadTableViewProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ leadId: number; column: string } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(getStoredColumns);

  // Conversion modal state
  const [conversionModal, setConversionModal] = useState<{ leadId: number; leadName: string } | null>(null);
  const [conversionNotes, setConversionNotes] = useState("");
  const [investmentInterest, setInvestmentInterest] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");

  // Lost modal state
  const [lostModal, setLostModal] = useState<{ leadId: number; leadName: string } | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostNotes, setLostNotes] = useState("");

  const allSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id));

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  }, [leads, allSelected]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem("lead-table-columns", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const selectedArray = useMemo(() => [...selectedIds], [selectedIds]);
  const cols = useMemo(() => ALL_COLUMNS.filter(c => visibleColumns.has(c.key)), [visibleColumns]);

  const handleStatusChange = useCallback((leadId: number, newStatus: string, leadName: string) => {
    if (newStatus === "CONVERTED") {
      setConversionModal({ leadId, leadName });
      setConversionNotes("");
      setInvestmentInterest("");
      setEstimatedAmount("");
      return;
    }
    if (newStatus === "LOST") {
      setLostModal({ leadId, leadName });
      setLostReason("");
      setLostNotes("");
      return;
    }
    onStatusChange(leadId, newStatus);
  }, [onStatusChange]);

  const handleConversionSubmit = useCallback(() => {
    if (!conversionModal) return;
    if (!conversionNotes.trim()) {
      toast.error("Please add conversion notes");
      return;
    }
    onStatusChange(conversionModal.leadId, "CONVERTED", {
      conversionNotes: conversionNotes.trim(),
      investmentInterest: investmentInterest.trim(),
      estimatedAmount: estimatedAmount.trim(),
    });
    setConversionModal(null);
  }, [conversionModal, conversionNotes, investmentInterest, estimatedAmount, onStatusChange]);

  const handleLostSubmit = useCallback(() => {
    if (!lostModal) return;
    if (!lostReason) {
      toast.error("Please select a loss reason");
      return;
    }
    onStatusChange(lostModal.leadId, "LOST", {
      lostReason,
      lostNotes: lostNotes.trim(),
    });
    setLostModal(null);
  }, [lostModal, lostReason, lostNotes, onStatusChange]);

  function SortIcon({ column }: { column: string }) {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-[#bd882c]" />
      : <ArrowDown className="h-3 w-3 ml-1 text-[#bd882c]" />;
  }

  function renderCell(lead: Lead, colKey: string) {
    const isEditing = editingCell?.leadId === lead.id && editingCell?.column === colKey;

    switch (colKey) {
      case "name":
        return (
          <button
            className="font-medium text-sm hover:text-[#bd882c] hover:underline text-left truncate max-w-[180px]"
            onClick={() => router.push(`/crm/leads/${lead.id}`)}
          >
            {lead.name}
          </button>
        );

      case "email":
        return lead.email ? (
          <button onClick={() => copyToClipboard(lead.email!, "Email")}
            className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[160px] block">
            {lead.email}
          </button>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "phone":
        return lead.phone ? (
          <button onClick={() => copyToClipboard(lead.phone!, "Phone")}
            className="text-xs text-muted-foreground hover:text-foreground font-mono">
            {lead.phone}
          </button>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "whatsapp":
        return lead.whatsappNumber ? (
          <a
            href={`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${lead.name}, this is from Vaivamm Capital.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            title={`WhatsApp ${lead.whatsappNumber}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span className="font-mono">{lead.whatsappNumber}</span>
          </a>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "company":
        return <span className="text-xs truncate max-w-[120px] block">{lead.company || "—"}</span>;

      case "source":
        return lead.source ? (
          <Badge variant="outline" className={cn("text-[10px] border-0", SOURCE_COLORS[lead.source] || SOURCE_COLORS.other)}>
            {lead.source.replace("_", " ")}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "status":
        if (isEditing) {
          return (
            <Select defaultValue={lead.status} onValueChange={(v) => { handleStatusChange(lead.id, v, lead.name); setEditingCell(null); }}>
              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge
            variant="outline"
            className={cn("text-[10px] cursor-pointer border", STATUS_COLORS[lead.status])}
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "status" })}
          >
            {lead.status}
          </Badge>
        );

      case "priority":
        if (isEditing) {
          return (
            <Select defaultValue={lead.priority || "WARM"} onValueChange={(v) => { onPriorityChange(lead.id, v); setEditingCell(null); }}>
              <SelectTrigger className="h-7 text-xs w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          );
        }
        return lead.priority ? (
          <Badge
            variant="outline"
            className={cn("text-[10px] cursor-pointer border", PRIORITY_COLORS[lead.priority])}
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "priority" })}
          >
            {lead.priority}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "assignedTo":
        if (isEditing) {
          return (
            <Select onValueChange={(v) => { onAssign(lead.id, v); setEditingCell(null); }}>
              <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {teamMembers.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.name || "Unknown"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return lead.assignedTo?.name ? (
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "assignedTo" })}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={lead.assignedTo.image || ""} />
              <AvatarFallback className="text-[8px]">
                {lead.assignedTo.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs truncate max-w-[90px]">{lead.assignedTo.name}</span>
          </div>
        ) : (
          <span
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "assignedTo" })}
          >
            Unassigned
          </span>
        );

      case "score":
        return <span className="text-xs font-mono">{lead.score ?? 0}</span>;

      case "potentialValue":
        return <span className="text-xs font-mono">{formatINR(lead.potentialValue)}</span>;

      case "city":
        return <span className="text-xs">{lead.city || "—"}</span>;

      case "tags":
        return lead.tags?.length ? (
          <div className="flex gap-1 flex-wrap">
            {lead.tags.slice(0, 2).map(t => (
              <Badge key={t} variant="secondary" className="text-[9px] px-1">{t}</Badge>
            ))}
            {lead.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{lead.tags.length - 2}</span>}
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "sla": {
        if (!lead.slaDeadline) return <span className="text-xs text-muted-foreground">—</span>;
        const deadline = new Date(lead.slaDeadline);
        const overdue = deadline < new Date();
        return (
          <Badge variant="outline" className={cn("text-[10px]", overdue ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20")}>
            {overdue ? "Overdue" : timeAgo(lead.slaDeadline)}
          </Badge>
        );
      }

      case "createdAt":
        return <span className="text-xs text-muted-foreground">{timeAgo(lead.createdAt)}</span>;

      default:
        return null;
    }
  }

  return (
    <div className="space-y-0">
      {/* Column visibility toggle */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs text-muted-foreground">{totalCount} leads</span>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-7 w-[80px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)} className="text-xs">{s} / page</SelectItem>)}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                <Columns3 className="h-3.5 w-3.5 mr-1" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {ALL_COLUMNS.map(col => (
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
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/60">
              <TableRow className="hover:bg-muted/60">
                <TableHead className="w-10 px-3">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                {cols.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn("text-[11px] uppercase tracking-wider font-semibold px-3 py-2.5 whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:text-foreground"
                    )}
                    onClick={() => col.sortable && onSort(col.key)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon column={col.key} />}
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
                  <TableCell colSpan={cols.length + 1} className="text-center py-12 text-muted-foreground">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead, idx) => (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      idx % 2 === 1 && "bg-muted/20",
                      selectedIds.has(lead.id) && "bg-[#bd882c]/5",
                      "hover:bg-muted/40 transition-colors"
                    )}
                  >
                    <TableCell className="px-3">
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    {cols.map(col => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 px-1">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border border-border shadow-lg rounded-lg px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />

          <Select onValueChange={(v) => { onBulkUpdate(selectedArray, { status: v }); setSelectedIds(new Set()); }}>
            <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => { onBulkUpdate(selectedArray, { priority: v }); setSelectedIds(new Set()); }}>
            <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => { onBulkUpdate(selectedArray, { assignedToId: v }); setSelectedIds(new Set()); }}>
            <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
            <SelectContent>
              {teamMembers.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">{m.name || "Unknown"}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={async () => {
            try {
              const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
              const selected = leads.filter(l => selectedIds.has(l.id));
              await downloadXlsx("leads-selected.xlsx", [{
                name: "Leads",
                columns: [
                  { header: "Name", key: "name", width: 20 },
                  { header: "Email", key: "email", width: 25 },
                  { header: "Phone", key: "phone", width: 15 },
                  { header: "Status", key: "status", width: 12 },
                  { header: "Priority", key: "priority", width: 10 },
                  { header: "Value", key: "value", width: 15 },
                ],
                rows: selected.map(l => ({
                  name: l.name, email: l.email || "", phone: l.phone || "",
                  status: l.status, priority: l.priority || "", value: l.potentialValue || "",
                })),
              }]);
              toast.success("Exported");
            } catch { toast.error("Export failed"); }
          }}>
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>

          {isAdmin && (
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => {
              if (confirm(`Delete ${selectedIds.size} leads?`)) {
                onBulkDelete(selectedArray);
                setSelectedIds(new Set());
              }
            }}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}

          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Conversion Modal */}
      <Dialog open={!!conversionModal} onOpenChange={(open) => !open && setConversionModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead: {conversionModal?.leadName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="conversion-notes">Conversion Notes *</Label>
              <Textarea
                id="conversion-notes"
                placeholder="Describe why this lead is being converted..."
                value={conversionNotes}
                onChange={(e) => setConversionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investment-interest">Investment Interest</Label>
              <Input
                id="investment-interest"
                placeholder="e.g., Mutual Funds, SIP, Stocks"
                value={investmentInterest}
                onChange={(e) => setInvestmentInterest(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated-amount">Estimated Investment Amount</Label>
              <Input
                id="estimated-amount"
                type="number"
                placeholder="e.g., 500000"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConversionModal(null)}>Cancel</Button>
            <Button onClick={handleConversionSubmit} className="bg-emerald-600 hover:bg-emerald-700">Convert Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost Reason Modal */}
      <Dialog open={!!lostModal} onOpenChange={(open) => !open && setLostModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Lost: {lostModal?.leadName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Loss Reason *</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lost-notes">Additional Notes</Label>
              <Textarea
                id="lost-notes"
                placeholder="Optional additional details..."
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostModal(null)}>Cancel</Button>
            <Button onClick={handleLostSubmit} variant="destructive">Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
