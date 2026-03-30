"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, DollarSign, TrendingUp, Clock, Trophy,
  GripVertical, User, Calendar, MoreHorizontal, Pencil, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn, resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { api } from "@/trpc/react";
import { toast } from "sonner";

const STAGES = [
  { key: "LEAD", label: "Lead", color: "#3B82F6", bg: "bg-blue-500/10" },
  { key: "CONTACTED", label: "Contacted", color: "#0EA5E9", bg: "bg-sky-500/10" },
  { key: "PROPOSAL", label: "Proposal", color: "#F59E0B", bg: "bg-amber-500/10" },
  { key: "NEGOTIATION", label: "Negotiation", color: "#8B5CF6", bg: "bg-purple-500/10" },
  { key: "WON", label: "Won", color: "#10B981", bg: "bg-emerald-500/10" },
  { key: "LOST", label: "Lost", color: "#EF4444", bg: "bg-red-500/10" },
] as const;

type DealStage = typeof STAGES[number]["key"];

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export default function DealsPage() {
  const utils = api.useUtils();
  const { data: allDeals, isLoading } = api.deals.getAll.useQuery();
  const { data: employees } = api.hr.getEmployees.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  const updateStageMutation = api.deals.updateStage.useMutation({
    onSuccess: () => {
      utils.deals.getAll.invalidate();
      toast.success("Deal stage updated");
    },
  });

  const deleteMutation = api.deals.delete.useMutation({
    onSuccess: () => {
      utils.deals.getAll.invalidate();
      toast.success("Deal deleted");
    },
  });

  const dealsByStage = useMemo(() => {
    const map: Record<string, typeof allDeals> = {};
    for (const s of STAGES) map[s.key] = [];
    allDeals?.forEach(d => {
      if (map[d.stage]) map[d.stage]!.push(d);
    });
    return map;
  }, [allDeals]);

  const stats = useMemo(() => {
    if (!allDeals) return { total: 0, totalValue: 0, wonValue: 0, avgProbability: 0 };
    const active = allDeals.filter(d => d.stage !== "LOST");
    return {
      total: allDeals.length,
      totalValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
      wonValue: allDeals.filter(d => d.stage === "WON").reduce((s, d) => s + Number(d.value || 0), 0),
      avgProbability: active.length > 0
        ? Math.round(active.reduce((s, d) => s + (d.probability || 0), 0) / active.length)
        : 0,
    };
  }, [allDeals]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <PageHeader title="Deals Pipeline" description="Track and manage your deals across stages" />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#bd882c] hover:bg-[#a67724] text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <CreateDealForm
              employees={employees || []}
              onSuccess={() => {
                setCreateOpen(false);
                utils.deals.getAll.invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Deals", value: stats.total, icon: TrendingUp, color: "text-blue-400" },
          { label: "Pipeline Value", value: formatINR(stats.totalValue), icon: DollarSign, color: "text-gold" },
          { label: "Won Value", value: formatINR(stats.wonValue), icon: Trophy, color: "text-emerald-400" },
          { label: "Avg Probability", value: `${stats.avgProbability}%`, icon: Clock, color: "text-purple-400" },
        ].map(s => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className={cn("h-5 w-5", s.color)} />
                <span className="text-2xl font-bold tabular-nums">{s.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-x-auto -mx-2 px-2">
        <div className="inline-flex gap-3 sm:gap-4 min-w-full pb-4">
          {STAGES.map(stage => {
            const stageDeals = dealsByStage[stage.key] || [];
            const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);

            return (
              <div key={stage.key} className="w-56 sm:w-64 md:w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold">{stage.label}</span>
                    <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatINR(stageValue)}</span>
                </div>

                <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30 border border-border/50">
                  {stageDeals.map(deal => (
                    <Card key={deal.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium line-clamp-1">{deal.name}</h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-0.5">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STAGES.filter(s => s.key !== deal.stage).map(s => (
                                <DropdownMenuItem
                                  key={s.key}
                                  onClick={() => updateStageMutation.mutate({ id: deal.id, stage: s.key })}
                                >
                                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                                  Move to {s.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this deal? This action cannot be undone.")) {
                                    deleteMutation.mutate({ id: deal.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="text-lg font-bold text-[#bd882c] mt-1">
                          {formatINR(Number(deal.value || 0))}
                        </p>

                        {deal.contactPerson && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {deal.contactPerson}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          {deal.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={resolveImageUrl(deal.assignedTo.image)} />
                                <AvatarFallback className="text-[8px]">
                                  {deal.assignedTo.name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{deal.assignedTo.name}</span>
                            </div>
                          ) : <span />}

                          {deal.expectedCloseDate && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>

                        {deal.probability !== null && deal.probability > 0 && (
                          <div className="mt-2">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#bd882c]"
                                style={{ width: `${deal.probability}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{deal.probability}% probability</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateDealForm({
  employees,
  onSuccess,
}: {
  employees: Array<{ id: string; name: string | null }>;
  onSuccess: () => void;
}) {
  const createMutation = api.deals.create.useMutation({
    onSuccess: () => {
      toast.success("Deal created");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get("name") as string,
      value: (fd.get("value") as string) || "0",
      stage: (fd.get("stage") as DealStage) || "LEAD",
      probability: Number(fd.get("probability") || 0),
      contactPerson: (fd.get("contactPerson") as string) || undefined,
      contactEmail: (fd.get("contactEmail") as string) || undefined,
      contactPhone: (fd.get("contactPhone") as string) || undefined,
      assignedToId: (fd.get("assignedToId") as string) || undefined,
      expectedCloseDate: (fd.get("expectedCloseDate") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Deal Name *</Label>
          <Input id="name" name="name" required placeholder="e.g. Enterprise License" />
        </div>
        <div>
          <Label htmlFor="value">Value (INR)</Label>
          <Input id="value" name="value" type="number" placeholder="0" />
        </div>
        <div>
          <Label htmlFor="stage">Stage</Label>
          <Select name="stage" defaultValue="LEAD">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map(s => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="probability">Probability (%)</Label>
          <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="expectedCloseDate">Expected Close</Label>
          <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
        </div>
        <div>
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input id="contactPerson" name="contactPerson" placeholder="Name" />
        </div>
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="email@example.com" />
        </div>
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input id="contactPhone" name="contactPhone" placeholder="+91..." />
        </div>
        <div>
          <Label htmlFor="assignedToId">Assigned To</Label>
          <Select name="assignedToId">
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name || e.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Additional notes..." className="min-h-[80px]" />
      </div>
      <Button type="submit" className="w-full bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creating..." : "Create Deal"}
      </Button>
    </form>
  );
}
