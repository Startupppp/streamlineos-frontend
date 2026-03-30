"use client";

import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, Users, TrendingUp, UserPlus, Target,
  Phone, Mail, MessageSquare, MapPin, Calendar, Clock, Building2,
  ChevronRight, X, Edit2, UserCheck, ArrowRight, Zap, Eye,
  IndianRupee, User, Flame, Sun, Snowflake, StickyNote, Megaphone, Globe, Share2, Footprints, GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { CsvUploadDialog } from "@/components/crm/csv-upload-dialog";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useLeadBoard, useLeadStats, useCreateLead, useUpdateLeadStatus,
  useSelfAssignLead, useAssignLead, useLeadDetail, useLogLeadActivity,
} from "@/lib/hooks/trpc-hooks";
import { useDebouncedValue } from "@/hooks/use-debounce";
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
  const { data: board, isLoading: boardLoading, refetch: refetchBoard } = useLeadBoard();
  const { data: stats, isLoading: statsLoading } = useLeadStats();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const createLead = useCreateLead();
  const updateStatus = useUpdateLeadStatus();
  const selfAssign = useSelfAssignLead();

  const filteredBoard = useMemo(() => {
    if (!board) return null;
    if (!debouncedSearchQuery) return board;
    const q = debouncedSearchQuery.toLowerCase();
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
  }, [board, debouncedSearchQuery]);

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
      referredBy: (formData.get("referredBy") as string)?.trim() || undefined,
    };

    try {
      await createLead.mutateAsync(data);
      toast.success("Lead created successfully");
      setCreateOpen(false);
    } catch {
      toast.error("Failed to create lead");
    }
  }, [createLead]);

  const handleMoveStatus = useCallback(async (leadId: number, status: LeadStatus, expectedStatus?: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ leadId, status, expectedStatus });
      toast.success(`Lead moved to ${STATUS_CONFIG[status].label}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
      refetchBoard();
    }
  }, [updateStatus, refetchBoard]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const leadId = parseInt(draggableId);
    const newStatus = destination.droppableId as LeadStatus;

    if (source.droppableId !== destination.droppableId) {
      handleMoveStatus(leadId, newStatus, source.droppableId as LeadStatus);
    }
  }, [handleMoveStatus]);

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
        <div className="flex items-center gap-2">
          <CsvUploadDialog onSuccess={() => refetchBoard()} />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-white shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Create New Lead</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Add a new lead to your pipeline</p>
                </div>
              </div>
            </DialogHeader>
            <CreateLeadForm
              onSubmit={handleCreateLead}
              isPending={createLead.isPending}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
        </div>
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

      <motion.div variants={fadeUp} className="overflow-x-auto pb-4 -mx-2 px-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 min-w-[900px] lg:min-w-0">
            {STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const StatusIcon = config.icon;
              const columnLeads: BoardLead[] = (filteredBoard as Record<string, BoardLead[]> | null)?.[status] ?? [];

              return (
                <div key={status} className="flex-1 min-w-[160px] sm:min-w-[180px] md:min-w-[200px]">
                  <div className={cn("rounded-xl border h-full flex flex-col", config.border, "bg-muted/20")}>
                    {/* Column Header */}
                    <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b", config.border, config.bg)}>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("h-4 w-4", config.color)} />
                        <h3 className={cn("text-sm font-semibold", config.color)}>{config.label}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs tabular-nums h-5 min-w-[20px] flex items-center justify-center">
                        {columnLeads.length}
                      </Badge>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto transition-colors duration-200",
                            snapshot.isDraggingOver && "bg-gold/5 ring-1 ring-inset ring-gold/20 rounded-b-xl"
                          )}
                        >
                          {columnLeads.map((lead: BoardLead, index: number) => (
                            <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className="group"
                                >
                                  <Card
                                    className={cn(
                                      "cursor-pointer transition-all border-border/40",
                                      dragSnapshot.isDragging
                                        ? "shadow-xl ring-2 ring-gold/30 rotate-[2deg] scale-105"
                                        : "hover:shadow-md hover:border-gold/30"
                                    )}
                                    onClick={() => setSelectedLeadId(lead.id)}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-start gap-2">
                                        {/* Drag Handle */}
                                        <div
                                          {...dragProvided.dragHandleProps}
                                          className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                        >
                                          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium truncate">{lead.name}</p>
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

                                          {lead.company && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                              <Building2 className="h-3 w-3" />
                                              {lead.company}
                                            </p>
                                          )}

                                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
                                                      handleMoveStatus(lead.id, "LOST", status);
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
                                                        handleMoveStatus(lead.id, STATUSES[nextIdx], status);
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
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {columnLeads.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-8 text-muted-foreground/40">
                              <p className="text-xs">No leads</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
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

function ActivityForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}) {
  const [activityType, setActivityType] = useState<string>("call");

  return (
    <form
      action={(formData) => {
        formData.set("activityType", activityType);
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <div>
        <Label className="text-xs font-medium mb-2 block">Activity Type</Label>
        <Select value={activityType} onValueChange={setActivityType}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">
              <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone Call</span>
            </SelectItem>
            <SelectItem value="email">
              <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</span>
            </SelectItem>
            <SelectItem value="whatsapp">
              <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</span>
            </SelectItem>
            <SelectItem value="meeting">
              <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Meeting</span>
            </SelectItem>
            <SelectItem value="site_visit">
              <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Site Visit</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="subject" className="text-xs font-medium mb-2 block">Subject</Label>
        <Input id="subject" name="subject" placeholder="Brief description" className="h-10" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration" className="text-xs font-medium mb-2 block">Duration (min)</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="duration" name="duration" type="number" placeholder="30" className="pl-9 h-10" />
          </div>
        </div>
        <div>
          <Label htmlFor="outcome" className="text-xs font-medium mb-2 block">Outcome</Label>
          <Input id="outcome" name="outcome" placeholder="Positive / Negative" className="h-10" />
        </div>
      </div>
      <div>
        <Label htmlFor="activityNotes" className="text-xs font-medium mb-2 block">Notes</Label>
        <Textarea id="activityNotes" name="activityNotes" rows={3} placeholder="What happened during this interaction?" className="resize-none" />
      </div>
      <div>
        <Label htmlFor="location" className="text-xs font-medium mb-2 block">Location (for meetings/visits)</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="location" name="location" placeholder="Office / Client location" className="pl-9 h-10" />
        </div>
      </div>
      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white h-10 mt-2" disabled={isPending}>
        {isPending ? "Logging..." : "Log Activity"}
      </Button>
    </form>
  );
}

function CreateLeadForm({
  onSubmit,
  isPending,
  onCancel,
}: {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [priority, setPriority] = useState<string>("WARM");
  const [source, setSource] = useState<string>("referral");

  return (
    <form
      action={(formData) => {
        formData.set("priority", priority);
        formData.set("source", source);
        onSubmit(formData);
      }}
      className="px-6 py-5 space-y-6"
    >
      {/* Contact Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Contact Information</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="name" className="text-xs font-medium mb-1.5 block">
              Full Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Enter full name"
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs font-medium mb-1.5 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" name="email" type="email" placeholder="john@example.com" className="pl-9 h-10" />
            </div>
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs font-medium mb-1.5 block">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" name="phone" placeholder="+91 9876543210" className="pl-9 h-10" />
            </div>
          </div>
          <div>
            <Label htmlFor="company" className="text-xs font-medium mb-1.5 block">Company</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="company" name="company" placeholder="Acme Corp" className="pl-9 h-10" />
            </div>
          </div>
          <div>
            <Label htmlFor="city" className="text-xs font-medium mb-1.5 block">City</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="city" name="city" placeholder="Mumbai" className="pl-9 h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Lead Classification */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="h-4 w-4" />
          <span>Lead Classification</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOT">
                  <span className="flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 text-red-400" />
                    Hot
                  </span>
                </SelectItem>
                <SelectItem value="WARM">
                  <span className="flex items-center gap-2">
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    Warm
                  </span>
                </SelectItem>
                <SelectItem value="COLD">
                  <span className="flex items-center gap-2">
                    <Snowflake className="h-3.5 w-3.5 text-blue-400" />
                    Cold
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">
                  <span className="flex items-center gap-2"><Share2 className="h-3.5 w-3.5" /> Referral</span>
                </SelectItem>
                <SelectItem value="campaign">
                  <span className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> Campaign</span>
                </SelectItem>
                <SelectItem value="cold_call">
                  <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Cold Call</span>
                </SelectItem>
                <SelectItem value="website">
                  <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Website</span>
                </SelectItem>
                <SelectItem value="social_media">
                  <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Social Media</span>
                </SelectItem>
                <SelectItem value="walk_in">
                  <span className="flex items-center gap-2"><Footprints className="h-3.5 w-3.5" /> Walk-in</span>
                </SelectItem>
                <SelectItem value="other">
                  <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Other</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referred By — shown only when source is "referral" */}
          {source === "referral" && (
            <div className="sm:col-span-2">
              <Label htmlFor="referredBy" className="text-xs font-medium mb-1.5 block">
                Referred By <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="referredBy"
                  name="referredBy"
                  required
                  placeholder="Name of person who referred this lead"
                  className="pl-9 h-10"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IndianRupee className="h-4 w-4" />
          <span>Financial Details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="potentialValue" className="text-xs font-medium mb-1.5 block">Potential Value (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="potentialValue" name="potentialValue" type="number" min="0" step="1" placeholder="5,00,000" className="pl-9 h-10" />
            </div>
          </div>
          <div>
            <Label htmlFor="investmentInterest" className="text-xs font-medium mb-1.5 block">Investment Interest (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="investmentInterest" name="investmentInterest" type="number" min="0" step="1" placeholder="10,00,000" className="pl-9 h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <StickyNote className="h-4 w-4" />
          <span>Additional Notes</span>
        </div>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Any additional context about this lead..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-5">
          Cancel
        </Button>
        <Button type="submit" className="bg-gold hover:bg-gold/90 text-white h-10 px-6" disabled={isPending}>
          {isPending ? "Creating..." : "Create Lead"}
        </Button>
      </div>
    </form>
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {isLoading || !lead ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-border/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetHeader className="p-0">
                    <SheetTitle className="text-xl font-semibold">{lead.name}</SheetTitle>
                  </SheetHeader>
                  {lead.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{lead.company}</span>
                      {lead.designation && <span className="text-muted-foreground/60">· {lead.designation}</span>}
                    </p>
                  )}
                </div>
                <Badge className={cn("shrink-0 mt-0.5", STATUS_CONFIG[lead.status as LeadStatus]?.bg, STATUS_CONFIG[lead.status as LeadStatus]?.color, STATUS_CONFIG[lead.status as LeadStatus]?.border, "border")}>
                  {STATUS_CONFIG[lead.status as LeadStatus]?.label}
                </Badge>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Status Actions */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Move to</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.filter(s => s !== lead.status && s !== "LOST").map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      className={cn("text-xs h-8 gap-1.5", STATUS_CONFIG[s].border, "hover:bg-muted/50")}
                      onClick={() => onMoveStatus(lead.id, s)}
                    >
                      <ArrowRight className="h-3 w-3" />
                      {STATUS_CONFIG[s].label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <a href={`mailto:${lead.email}`} className="text-gold hover:underline truncate text-sm">{lead.email}</a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <a href={`tel:${lead.phone}`} className="hover:underline text-sm">{lead.phone}</a>
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span>{lead.city}</span>
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="capitalize">{lead.source.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial */}
              {(lead.potentialValue || lead.investmentInterest) && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Financials</p>
                  <div className="grid grid-cols-2 gap-3">
                    {lead.potentialValue && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                        <p className="text-[11px] text-muted-foreground mb-1">Potential Value</p>
                        <p className="text-lg font-bold text-emerald-400">₹{Number(lead.potentialValue).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                    {lead.investmentInterest && (
                      <div className="p-3.5 rounded-xl bg-gold/5 border border-gold/15">
                        <p className="text-[11px] text-muted-foreground mb-1">Investment Interest</p>
                        <p className="text-lg font-bold text-gold">₹{Number(lead.investmentInterest).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned To */}
              {lead.assignedTo && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned To</p>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                      <AvatarFallback className="text-xs">{getInitials(lead.assignedTo.name ?? "")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.assignedTo.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {lead.notes && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
                    <p className="text-sm leading-relaxed">{lead.notes}</p>
                  </div>
                </div>
              )}

              {/* Tabs Section */}
              <div className="pt-2">
                <Tabs value={activityTab} onValueChange={setActivityTab}>
                  <TabsList className="w-full h-10">
                    <TabsTrigger value="details" className="flex-1 text-xs">Details</TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1 text-xs">Activity Log</TabsTrigger>
                    <TabsTrigger value="new-activity" className="flex-1 text-xs">Log Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <p className="text-[11px] text-muted-foreground mb-1">Created</p>
                        <p className="text-sm font-medium">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <p className="text-[11px] text-muted-foreground mb-1">Assigned</p>
                        <p className="text-sm font-medium">{lead.assignedAt ? new Date(lead.assignedAt).toLocaleDateString() : "—"}</p>
                      </div>
                      {lead.convertedAt && (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-[11px] text-muted-foreground mb-1">Converted</p>
                          <p className="text-sm font-medium">{new Date(lead.convertedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                      {lead.campaign && (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <p className="text-[11px] text-muted-foreground mb-1">Campaign</p>
                          <p className="text-sm font-medium">{lead.campaign.name}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-5">
                    <ScrollArea className="h-[300px]">
                      {lead.activities && lead.activities.length > 0 ? (
                        <div className="space-y-3">
                          {lead.activities.map((activity: { id: number; type: string; date: string | Date; subject?: string | null; notes?: string | null; outcome?: string | null; user?: { name?: string | null } | null }) => (
                            <div key={activity.id} className="flex gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
                              <div className={cn(
                                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
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
                                  <span className="text-[11px] text-muted-foreground">{timeAgo(activity.date)}</span>
                                </div>
                                {activity.subject && <p className="text-xs text-muted-foreground mt-0.5">{activity.subject}</p>}
                                {activity.notes && <p className="text-xs mt-1.5 leading-relaxed">{activity.notes}</p>}
                                {activity.outcome && (
                                  <Badge variant="outline" className="text-[10px] mt-2">{activity.outcome}</Badge>
                                )}
                                {activity.user && (
                                  <p className="text-[10px] text-muted-foreground mt-1.5">by {activity.user.name}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground/50">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No activities yet</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="new-activity" className="mt-5">
                    <ActivityForm onSubmit={handleLogActivity} isPending={logActivity.isPending} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
