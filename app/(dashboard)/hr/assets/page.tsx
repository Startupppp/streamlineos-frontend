"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Laptop,
  Plus,
  Package,
  CheckCircle2,
  Wrench,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useHrAssets, useCreateAsset, useHrEmployees } from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { Asset } from "@/types/hr";
import { EmptyDevicesIllustration } from "@/components/illustrations";

function fmt(amount: string | number | null) {
  if (amount === null || amount === undefined) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  AVAILABLE: { label: "Available", variant: "outline" },
  ASSIGNED: { label: "Assigned", variant: "default" },
  MAINTENANCE: { label: "Maintenance", variant: "secondary" },
  RETIRED: { label: "Retired", variant: "destructive" },
};

const ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Phone",
  "Tablet",
  "Headset",
  "Keyboard",
  "Mouse",
  "Other",
];

export default function HrAssetsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const [name, setName] = useState("");
  const [type, setType] = useState("Laptop");
  const [status, setStatus] = useState("AVAILABLE");
  const [serialNumber, setSerialNumber] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useHrAssets();
  const { data: employeesData } = useHrEmployees({ limit: 200 });
  const createAsset = useCreateAsset();

  const items: Asset[] = Array.isArray(data) ? data : [];
  const filteredItems = statusFilter ? items.filter((a) => a.status === statusFilter) : items;

  const employees = employeesData as { data?: Array<{ id: string; name: string }>; items?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }> | undefined;
  const employeeList: Array<{ id: string; name: string }> = Array.isArray(employees) ? employees : (employees?.data ?? employees?.items ?? []);

  const counts = items.reduce(
    (acc, a) => {
      if (a.status === "AVAILABLE") acc.available++;
      else if (a.status === "ASSIGNED") acc.assigned++;
      else if (a.status === "MAINTENANCE") acc.maintenance++;
      acc.total++;
      return acc;
    },
    { total: 0, available: 0, assigned: 0, maintenance: 0 }
  );

  const resetForm = useCallback(() => {
    setName(""); setType("Laptop"); setStatus("AVAILABLE"); setSerialNumber(""); setAssignedTo("");
    setPurchaseDate(""); setPurchaseCost(""); setLocation(""); setNotes("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) { toast.error("Asset name is required"); return; }
    createAsset.mutate(
      {
        name: name.trim(),
        type,
        status,
        serialNumber: serialNumber || undefined,
        assignedTo: assignedTo || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
        location: location || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => { toast.success("Asset added"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, type, status, serialNumber, assignedTo, purchaseDate, purchaseCost, location, notes, createAsset, resetForm]);

  return (
    <PageWrapper
      title="Assets"
      subtitle="Manage company assets and assignments"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => {
              window.open("/api/hr/assets/export", "_blank", "noopener,noreferrer");
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Asset
          </Button>
        </div>
      }
      filters={
        <Tabs value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
            <TabsTrigger value="AVAILABLE" className="text-xs px-3 h-7">Available</TabsTrigger>
            <TabsTrigger value="ASSIGNED" className="text-xs px-3 h-7">Assigned</TabsTrigger>
            <TabsTrigger value="MAINTENANCE" className="text-xs px-3 h-7">Maintenance</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Assets" value={counts.total} icon={Package} color="blue" />
          <StatCard label="Available" value={counts.available} icon={CheckCircle2} color="green" />
          <StatCard label="Assigned" value={counts.assigned} icon={Laptop} color="gold" />
          <StatCard label="Maintenance" value={counts.maintenance} icon={Wrench} color="red" />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Purchased</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <EmptyDevicesIllustration className="h-36 w-36 opacity-95" />
                      <p>No assets found.</p>
                    </div></TableCell></TableRow>
                  ) : filteredItems.map((a) => {
                    const badge = STATUS_BADGE[a.status ?? "AVAILABLE"] ?? { label: a.status ?? "—", variant: "secondary" as const };
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{a.name}</TableCell>
                        <TableCell className="text-sm"><Badge variant="outline" className="text-[11px]">{a.type}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{a.serialNumber ?? "—"}</TableCell>
                        <TableCell><Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge></TableCell>
                        <TableCell className="text-sm">
                          {a.assignedTo ? employeeList.find((e) => e.id === a.assignedTo)?.name ?? a.assignedTo : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmt(a.purchaseCost)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.purchaseDate ? format(new Date(a.purchaseDate), "dd MMM yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Add Asset" description="Add a new company asset to the inventory." onSubmit={handleCreate} submitLabel="Add Asset" isPending={createAsset.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Asset Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MacBook Pro 16-inch" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Serial Number</label>
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Assign To</label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              {employeeList.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Purchase Date</label>
            <DatePicker value={purchaseDate} onChange={setPurchaseDate} placeholder="Pick date" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Purchase Cost (₹)</label>
            <Input value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} type="number" placeholder="0" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Location</label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bangalore Office" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
