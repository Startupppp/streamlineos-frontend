"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Megaphone, IndianRupee, TrendingUp, Users, Target,
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatINR(val: string | number | null | undefined): string {
  if (!val) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: "", budgetAllocated: "", status: "active" as "active" | "paused" | "completed" });

  const { data: stats } = api.dmCampaigns.getStats.useQuery();
  const { data, isLoading, refetch } = api.dmCampaigns.getAll.useQuery();

  const createMutation = api.dmCampaigns.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Campaign created"); setShowCreate(false); setFormData({ name: "", budgetAllocated: "", status: "active" }); },
    onError: (err) => toast.error(err.message),
  });

  const campaigns = data?.campaigns ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader title="Campaign Management" description="Manage marketing campaigns and track ROI" />
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Active Campaigns", value: stats?.active ?? 0, icon: Megaphone, color: "text-emerald-400" },
          { label: "Total Budget", value: formatINR(stats?.totalBudget), icon: IndianRupee, color: "text-blue-400" },
          { label: "Total Spent", value: formatINR(stats?.totalSpent), icon: TrendingUp, color: "text-amber-400" },
          { label: "Avg CPL", value: formatINR(stats?.avgCpl), icon: Target, color: "text-purple-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className={cn("h-5 w-5", s.color)} />
                <span className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Budget</TableHead>
                <TableHead className="text-xs">Spent</TableHead>
                <TableHead className="text-xs">Leads</TableHead>
                <TableHead className="text-xs">CPL</TableHead>
                <TableHead className="text-xs">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7} className="h-12"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                ))
              ) : campaigns.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No campaigns yet</TableCell></TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]",
                        c.status === "active" && "text-emerald-400 bg-emerald-500/10",
                        c.status === "paused" && "text-amber-400 bg-amber-500/10",
                        c.status === "completed" && "text-muted-foreground",
                      )}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{formatINR(c.budgetAllocated)}</TableCell>
                    <TableCell className="text-xs font-mono">{formatINR(c.budgetSpent || c.spend)}</TableCell>
                    <TableCell className="text-xs font-mono">{c.leadsGenerated}</TableCell>
                    <TableCell className="text-xs font-mono">{c.costPerLead ? formatINR(c.costPerLead) : "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{c.roi ? `${c.roi}%` : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Budget Allocated</Label><Input type="number" value={formData.budgetAllocated} onChange={(e) => setFormData(f => ({ ...f, budgetAllocated: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v as "active" | "paused" | "completed" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!formData.name} onClick={() => createMutation.mutate(formData)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
