"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, Users, TrendingUp, UserPlus, Target,
  Phone, Mail, MessageSquare, MapPin, Calendar, Clock, Building2,
  ChevronRight, X, Edit2, UserCheck, ArrowRight, Zap, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useLeadBoard, useLeadStats, useCreateLead, useUpdateLeadStatus,
  useSelfAssignLead, useAssignLead, useLeadDetail, useLogLeadActivity,
} from "@/lib/hooks/trpc-hooks";
import { toast } from "sonner";

const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
type LeadStatus = typeof STATUSES[number];

const LEAD_SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;
type LeadSource = typeof LEAD_SOURCES[number];
function isLeadSource(v: unknown): v is LeadSource {
  return typeof v === "string" && (LEAD_SOURCES as readonly string[]).includes(v);
}

const LEAD_PRIORITIES = ["HOT", "WARM", "COLD"] as const;
type LeadPriority = typeof LEAD_PRIORITIES[number];
function isLeadPriority(v: unknown): v is LeadPriority {
  return typeof v === "string" && (LEAD_PRIORITIES as readonly string[]).includes(v);
}

const ACTIVITY_TYPES = ["call", "email", "whatsapp", "meeting", "site_visit"] as const;
type LeadActivityType = typeof ACTIVITY_TYPES[number];
function isActivityType(v: unknown): v is LeadActivityType {
  return typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v);
}

interface BoardLead {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  priority?: string | null;
  potentialValue?: string | null;
  createdAt?: string | Date | null;
  assignedTo?: { name?: string | null; image?: string | null } | null;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  NEW: { label: "New", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Zap },
  CONTACTED: { label: "Contacted", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", icon: Phone },
  INTERESTED: { label: "Interested", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Eye },
  QUALIFIED: { label: "Qualified", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Target },
  CONVERTED: { label: "Converted", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: UserCheck },
  LOST: { label: "Lost", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: X },
};

const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-green-500/15 text-green-400 border-green-500/20",
  campaign: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  cold_call: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  website: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  social_media: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  walk_in: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  other: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 3600) return `in ${Math.floor(absDiff / 60)}m`;
    if (absDiff < 86400) return `in ${Math.floor(absDiff / 3600)}h`;
    return `in ${Math.floor(absDiff / 86400)}d`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function LeadsPipelinePage() {
  const { data: board, isLoading: boardLoading } = useLeadBoard();
  const { data: stats, isLoading: statsLoading } = useLeadStats();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const createLead = useCreateLead();
  const updateStatus = useUpdateLeadStatus();
  const selfAssign = useSelfAssignLead();

  const filteredBoard = useMemo(() => {
    if (!board) return null;
    if (!searchQuery) return board;
    const q = searchQuery.toLowerCase();
    const filtered: Record<string, typeof board[keyof typeof board]> = {};
    for (const [status, leads] of Object.entries(board)) {
      filtered[status] = leads.filter((l: BoardLead) =>
        l.name.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.company?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [board, searchQuery]);

  const handleCreateLead = useCallback(async (formData: FormData) => {
    const name = (formData.get("name") as string)?.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }

    const potentialValueRaw = (formData.get("potentialValue") as string)?.trim();
    const investmentInterestRaw = (formData.get("investmentInterest") as string)?.trim();

    if (potentialValueRaw && (isNaN(Number(potentialValueRaw)) || Number(potentialValueRaw) < 0)) {
      toast.error("Potential value must be a valid positive number");
      return;
    }
    if (investmentInterestRaw && (isNaN(Number(investmentInterestRaw)) || Number(investmentInterestRaw) < 0)) {
      toast.error("Investment interest must be a valid positive number");
      return;
    }

    const data = {
      name,
      email: (formData.get("email") as string)?.trim() || undefined,
      phone: (formData.get("phone") as string)?.trim() || undefined,
      company: (formData.get("company") as string)?.trim() || undefined,
      source: isLeadSource(formData.get("source")) ? formData.get("source") as LeadSource : "other",
      potentialValue: potentialValueRaw || undefined,
      investmentInterest: investmentInterestRaw || undefined,
      priority: isLeadPriority(formData.get("priority")) ? formData.get("priority") as LeadPriority : "WARM",
      notes: (formData.get("notes") as string)?.trim() || undefined,
      city: (formData.get("city") as string)?.trim() || undefined,
    };

    try {
      await createLead.mutateAsync(data);
      toast.success("Lead created successfully");
      setCreateOpen(false);
    } catch {
      toast.error("Failed to create lead");
    }
  }, [createLead]);

  const handleMoveStatus = useCallback(async (leadId: number, status: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ leadId, status });
      toast.success(`Lead moved to ${STATUS_CONFIG[status].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  }, [updateStatus]);

  if (boardLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-96" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Lead Pipeline"
          description="Track and manage your sales leads through the conversion funnel"
        />
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-white shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create New Lead</SheetTitle>
            </SheetHeader>
            <form action={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" name="name" required placeholder="John Doe" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="john@example.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+91 9876543210" />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" placeholder="Acme Corp" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" placeholder="Mumbai" />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue="WARM"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="HOT">🔥 Hot</option>
                    <option value="WARM">🌤 Warm</option>
                    <option value="COLD">❄️ Cold</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <select
                    id="source"
                    name="source"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="referral">Referral</option>
                    <option value="campaign">Campaign</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="website">Website</option>
                    <option value="social_media">Social Media</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="potentialValue">Potential Value (₹)</Label>
                  <Input id="potentialValue" name="potentialValue" type="number" min="0" step="1" placeholder="500000" />
                </div>
                <div>
                  <Label htmlFor="investmentInterest">Investment Interest (₹)</Label>
                  <Input id="investmentInterest" name="investmentInterest" type="number" min="0" step="1" placeholder="1000000" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Additional notes about this lead..." rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-gold hover:bg-gold/90 text-white" disabled={createLead.isPending}>
                  {createLead.isPending ? "Creating..." : "Create Lead"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </motion.div>

      {stats && (
        <motion.div variants={fadeUp} className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total Leads", value: stats.total, icon: Users, color: "text-blue-400" },
            { label: "New This Month", value: stats.thisMonth, icon: Zap, color: "text-emerald-400" },
            { label: "Qualified", value: stats.byStatus.QUALIFIED, icon: Target, color: "text-purple-400" },
            { label: "Converted", value: stats.byStatus.CONVERTED, icon: UserCheck, color: "text-green-400" },
            { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-amber-400" },
            { label: "Unassigned", value: stats.unassigned, icon: UserPlus, color: "text-red-400" },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-noir border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                  <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px]">
          {STATUSES.map((status) => {
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const columnLeads: BoardLead[] = (filteredBoard as Record<string, BoardLead[]> | null)?.[status] ?? [];

            return (
              <div key={status} className="flex-1 min-w-[200px]">
                <div className={cn("rounded-xl border p-3 h-full", config.border, config.bg)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn("h-4 w-4", config.color)} />
                      <h3 className={cn("text-sm font-semibold", config.color)}>{config.label}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs tabular-nums">
                      {columnLeads.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    <AnimatePresence>
                      {columnLeads.map((lead: BoardLead) => (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group"
                        >
                          <Card
                            className="cursor-pointer hover:shadow-md transition-all hover:border-gold/30 border-border/40"
                            onClick={() => setSelectedLeadId(lead.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{lead.name}</p>
                                  {lead.company && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Building2 className="h-3 w-3" />
                                      {lead.company}
                                    </p>
                                  )}
                                </div>
                                {lead.assignedTo ? (
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(lead.assignedTo.name ?? "")}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selfAssign.mutate({ leadId: lead.id }, {
                                        onSuccess: () => toast.success("Lead assigned to you"),
                                      });
                                    }}
                                    className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-gold/50 transition-colors"
                                    aria-label="Self-assign this lead"
                                  >
                                    <Plus className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {lead.priority && (
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full border font-semibold",
                                    lead.priority === "HOT" && "bg-red-500/15 text-red-400 border-red-500/30",
                                    lead.priority === "WARM" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                                    lead.priority === "COLD" && "bg-blue-400/15 text-blue-400 border-blue-400/30",
                                  )}>
                                    {lead.priority}
                                  </span>
                                )}
                                {lead.source && (
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", SOURCE_COLORS[lead.source] || SOURCE_COLORS.other)}>
                                    {lead.source.replace("_", " ")}
                                  </span>
                                )}
                                {lead.potentialValue && Number(lead.potentialValue) > 0 && (
                                  <span className="text-[10px] text-emerald-400 font-medium">
                                    ₹{Number(lead.potentialValue).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                                <span className="text-[10px] text-muted-foreground">
                                  {lead.createdAt ? timeAgo(lead.createdAt) : "—"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {status !== "CONVERTED" && status !== "LOST" && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveStatus(lead.id, "LOST");
                                        }}
                                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                        aria-label="Mark as lost"
                                      >
                                        <X className="h-3 w-3 text-red-400" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextIdx = STATUSES.indexOf(status) + 1;
                                          if (nextIdx < STATUSES.length - 1) {
                                            handleMoveStatus(lead.id, STATUSES[nextIdx]);
                                          }
                                        }}
                                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-gold/20 transition-colors"
                                        aria-label="Move to next stage"
                                      >
                                        <ArrowRight className="h-3 w-3 text-gold" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {columnLeads.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <p className="text-xs">No leads</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onMoveStatus={handleMoveStatus}
      />
    </motion.div>
  );
}

function LeadDetailSheet({
  leadId,
  open,
  onClose,
  onMoveStatus,
}: {
  leadId: number | null;
  open: boolean;
  onClose: () => void;
  onMoveStatus: (leadId: number, status: LeadStatus) => void;
}) {
  const { data: lead, isLoading } = useLeadDetail(leadId ?? 0);
  const logActivity = useLogLeadActivity();
  const [activityTab, setActivityTab] = useState("details");

  const handleLogActivity = useCallback(async (formData: FormData) => {
    if (!leadId) return;
    try {
      const activityType = formData.get("activityType");
      if (!isActivityType(activityType)) {
        toast.error("Invalid activity type");
        return;
      }
      await logActivity.mutateAsync({
        leadId,
        type: activityType,
        date: new Date().toISOString(),
        duration: formData.get("duration") ? Number(formData.get("duration")) : undefined,
        subject: formData.get("subject") as string || undefined,
        notes: formData.get("activityNotes") as string || undefined,
        outcome: formData.get("outcome") as string || undefined,
        location: formData.get("location") as string || undefined,
        messageSummary: formData.get("messageSummary") as string || undefined,
      });
      toast.success("Activity logged");
    } catch {
      toast.error("Failed to log activity");
    }
  }, [leadId, logActivity]);

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading || !lead ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">{lead.name}</SheetTitle>
                  {lead.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="h-3.5 w-3.5" /> {lead.company}
                      {lead.designation && <span>· {lead.designation}</span>}
                    </p>
                  )}
                </div>
                <Badge className={cn("shrink-0", STATUS_CONFIG[lead.status as LeadStatus]?.bg, STATUS_CONFIG[lead.status as LeadStatus]?.color)}>
                  {STATUS_CONFIG[lead.status as LeadStatus]?.label}
                </Badge>
              </div>
            </SheetHeader>

            <div className="py-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {STATUSES.filter(s => s !== lead.status && s !== "LOST").map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className={cn("text-xs h-7", STATUS_CONFIG[s].border)}
                    onClick={() => onMoveStatus(lead.id, s)}
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    {STATUS_CONFIG[s].label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.email}`} className="text-gold hover:underline truncate">{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                  </div>
                )}
                {lead.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.city}</span>
                  </div>
                )}
                {lead.source && (
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{lead.source.replace("_", " ")}</span>
                  </div>
                )}
              </div>

              {(lead.potentialValue || lead.investmentInterest) && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  {lead.potentialValue && (
                    <div>
                      <p className="text-xs text-muted-foreground">Potential Value</p>
                      <p className="text-lg font-bold text-emerald-400">₹{Number(lead.potentialValue).toLocaleString("en-IN")}</p>
                    </div>
                  )}
                  {lead.investmentInterest && (
                    <div>
                      <p className="text-xs text-muted-foreground">Investment Interest</p>
                      <p className="text-lg font-bold text-gold">₹{Number(lead.investmentInterest).toLocaleString("en-IN")}</p>
                    </div>
                  )}
                </div>
              )}

              {lead.assignedTo && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                    <AvatarFallback className="text-xs">{getInitials(lead.assignedTo.name ?? "")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.assignedTo.email}</p>
                  </div>
                </div>
              )}

              {lead.notes && (
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{lead.notes}</p>
                </div>
              )}

              <Tabs value={activityTab} onValueChange={setActivityTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1">Activity Log</TabsTrigger>
                  <TabsTrigger value="new-activity" className="flex-1">Log Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Created</p>
                      <p>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Assigned</p>
                      <p>{lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString() : "—"}</p>
                    </div>
                    {lead.convertedAt && (
                      <div>
                        <p className="text-muted-foreground text-xs">Converted</p>
                        <p>{new Date(lead.convertedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                    {lead.campaign && (
                      <div>
                        <p className="text-muted-foreground text-xs">Campaign</p>
                        <p>{lead.campaign.name}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {lead.activities && lead.activities.length > 0 ? (
                      <div className="space-y-3">
                        {lead.activities.map((activity: { id: number; type: string; date: string | Date; subject?: string | null; notes?: string | null; outcome?: string | null; user?: { name?: string | null } | null }) => (
                          <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                              activity.type === "call" ? "bg-blue-500/15 text-blue-400" :
                              activity.type === "email" ? "bg-purple-500/15 text-purple-400" :
                              activity.type === "whatsapp" ? "bg-green-500/15 text-green-400" :
                              activity.type === "meeting" ? "bg-amber-500/15 text-amber-400" :
                              "bg-cyan-500/15 text-cyan-400"
                            )}>
                              {activity.type === "call" ? <Phone className="h-4 w-4" /> :
                               activity.type === "email" ? <Mail className="h-4 w-4" /> :
                               activity.type === "whatsapp" ? <MessageSquare className="h-4 w-4" /> :
                               activity.type === "meeting" ? <Calendar className="h-4 w-4" /> :
                               <MapPin className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium capitalize">{activity.type.replace("_", " ")}</p>
                                <span className="text-xs text-muted-foreground">{timeAgo(activity.date)}</span>
                              </div>
                              {activity.subject && <p className="text-xs text-muted-foreground">{activity.subject}</p>}
                              {activity.notes && <p className="text-xs mt-1">{activity.notes}</p>}
                              {activity.outcome && (
                                <Badge variant="outline" className="text-[10px] mt-1">{activity.outcome}</Badge>
                              )}
                              {activity.user && (
                                <p className="text-[10px] text-muted-foreground mt-1">by {activity.user.name}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <p className="text-sm">No activities yet</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="new-activity" className="mt-4">
                  <form action={handleLogActivity} className="space-y-3">
                    <div>
                      <Label htmlFor="activityType">Activity Type</Label>
                      <select
                        id="activityType"
                        name="activityType"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="call">Phone Call</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="meeting">Meeting</option>
                        <option value="site_visit">Site Visit</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" name="subject" placeholder="Brief description" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="duration">Duration (min)</Label>
                        <Input id="duration" name="duration" type="number" placeholder="30" />
                      </div>
                      <div>
                        <Label htmlFor="outcome">Outcome</Label>
                        <Input id="outcome" name="outcome" placeholder="Positive / Negative" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="activityNotes">Notes</Label>
                      <Textarea id="activityNotes" name="activityNotes" rows={3} placeholder="What happened during this interaction?" />
                    </div>
                    <div>
                      <Label htmlFor="location">Location (for meetings/visits)</Label>
                      <Input id="location" name="location" placeholder="Office / Client location" />
                    </div>
                    <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={logActivity.isPending}>
                      {logActivity.isPending ? "Logging..." : "Log Activity"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
