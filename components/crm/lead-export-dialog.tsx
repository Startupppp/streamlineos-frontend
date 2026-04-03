"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { useLeads } from "@/lib/api/hooks/leads";
import { toast } from "sonner";

const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
const SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;
const PRIORITIES = ["HOT", "WARM", "COLD"] as const;

export function LeadExportDialog() {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    source: "all",
    priority: "all",
    dateFrom: "",
    dateTo: "",
  });

  const { data } = useLeads(
    {
      status: filters.status !== "all" ? filters.status as typeof STATUSES[number] : undefined,
      source: filters.source !== "all" ? filters.source as typeof SOURCES[number] : undefined,
      priority: filters.priority !== "all" ? filters.priority as typeof PRIORITIES[number] : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    { enabled: open }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const leads = data?.leads ?? [];

      if (leads.length === 0) {
        toast.error("No leads found with current filters");
        return;
      }

      await downloadXlsx("leads-export.xlsx", [{
        name: "Leads",
        columns: [
          { header: "#", key: "id", width: 8 },
          { header: "Name", key: "name", width: 20 },
          { header: "Email", key: "email", width: 25 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "WhatsApp", key: "whatsapp", width: 15 },
          { header: "Company", key: "company", width: 20 },
          { header: "Source", key: "source", width: 12 },
          { header: "Status", key: "status", width: 12 },
          { header: "Priority", key: "priority", width: 10 },
          { header: "Value", key: "potentialValue", width: 15 },
          { header: "City", key: "city", width: 12 },
          { header: "Score", key: "score", width: 8 },
          { header: "Assigned To", key: "assignedTo", width: 18 },
          { header: "Created", key: "createdAt", width: 18 },
          { header: "Notes", key: "notes", width: 30 },
        ],
        rows: leads.map(l => ({
          id: l.id,
          name: l.name,
          email: l.email || "",
          phone: l.phone || "",
          whatsapp: l.whatsappNumber || "",
          company: l.company || "",
          source: l.source || "",
          status: l.status,
          priority: l.priority || "",
          potentialValue: l.potentialValue || "",
          city: l.city || "",
          score: l.score || 0,
          assignedTo: l.assignedTo?.name || "",
          createdAt: l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "",
          notes: l.notes || "",
        })),
      }]);

      toast.success(`Exported ${leads.length} leads`);
      setOpen(false);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Leads to Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={filters.source} onValueChange={(v) => setFilters(f => ({ ...f, source: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Sources</SelectItem>
                  {SOURCES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input type="date" className="h-8 text-xs" value={filters.dateFrom} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input type="date" className="h-8 text-xs" value={filters.dateTo} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {data?.totalCount ?? 0} leads match current filters
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting || !data?.leads?.length}>
            {isExporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Export ({data?.totalCount ?? 0})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
