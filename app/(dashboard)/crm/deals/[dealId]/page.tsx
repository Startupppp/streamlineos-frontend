"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, User, Edit2, Trophy, XCircle,
  ChevronRight, Clock, Phone, Mail, StickyNote, PhoneCall, Video,
  Plus, Trash2, CalendarCheck, Users, Link2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useDealDetail, useUpdateDeal, useUpdateDealStage, useDealActivities, useLogDealActivity,
  useDealMeetings, useCreateDealMeeting, useDeleteDealMeeting,
  type DealMeeting,
} from "@/lib/api/hooks/crm";
import { toast } from "sonner";
import Link from "next/link";
import { DealEditForm, type EditFormValues } from "@/features/crm/deals/detail/deal-edit-form";
import { ActivityTimeline } from "@/features/crm/deals/detail/activity-timeline";
import { LogActivityDialog } from "@/features/crm/deals/detail/log-activity-dialog";
import { AIPredictDealButton } from "@/features/crm/deals/ai-predict-deal-button";
import Image from "next/image";

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

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId: dealIdStr } = use(params);
  const dealId = Number(dealIdStr);
  const router = useRouter();

  const { data: deal, isLoading } = useDealDetail(dealId);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "call" | "note" | "email" | "meeting";
    label: string;
  } | null>(null);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("30");
  const [meetingAttendees, setMeetingAttendees] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingActionItems, setMeetingActionItems] = useState("");
  const [meetingRecordingLink, setMeetingRecordingLink] = useState("");

  const updateDeal = useUpdateDeal();
  const { data: activities } = useDealActivities(dealId, 30);
  const { data: meetings } = useDealMeetings(dealId);
  const logActivity = useLogDealActivity();
  const createMeeting = useCreateDealMeeting(dealId);
  const deleteMeeting = useDeleteDealMeeting(dealId);
  const updateStage = useUpdateDealStage();

  const currentStageIndex = useMemo(() => {
    if (!deal) return -1;
    return STAGES.findIndex(s => s.key === deal.stage);
  }, [deal]);

  const handleStageChange = useCallback((stage: DealStage) => {
    updateStage.mutate(
      { id: dealId, stage },
      { onSuccess: () => toast.success("Stage updated"), onError: (err) => toast.error(err.message) },
    );
  }, [dealId, updateStage]);

  const onEditSubmit = useCallback((data: EditFormValues) => {
    updateDeal.mutate(
      {
        id: dealId,
        name: data.name,
        value: data.value || "0",
        stage: data.stage,
        probability: data.probability,
        contactPerson: data.contactPerson || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        expectedCloseDate: data.expectedCloseDate || undefined,
        notes: data.notes || undefined,
        lostReason: data.lostReason || undefined,
      },
      { onSuccess: () => { toast.success("Deal updated"); setIsEditing(false); }, onError: (err) => toast.error(err.message) },
    );
  }, [dealId, updateDeal]);

  const handleBackToDeals = useCallback(() => router.push("/crm/deals"), [router]);
  const handleToggleEdit = useCallback(() => setIsEditing((v) => !v), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleMarkWon = useCallback(() => handleStageChange("WON"), [handleStageChange]);
  const handleMarkLost = useCallback(() => handleStageChange("LOST"), [handleStageChange]);

  const handleStagePipelineClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const stage = e.currentTarget.dataset.stage as DealStage;
    if (stage) handleStageChange(stage);
  }, [handleStageChange]);

  const handleQuickActionClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const type = e.currentTarget.dataset.actionType as "call" | "note" | "email" | "meeting";
    const label = e.currentTarget.dataset.actionLabel ?? "";
    setPendingAction({ type, label });
  }, []);

  const handleLogActivity = useCallback((notes: string) => {
    if (!pendingAction) return;
    logActivity.mutate(
      { dealId, type: pendingAction.type, subject: pendingAction.label, notes },
      {
        onSuccess: () => { toast.success("Activity logged"); setPendingAction(null); },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [pendingAction, logActivity, dealId]);

  const handleCloseLogDialog = useCallback(() => setPendingAction(null), []);

  const handleCreateMeeting = useCallback(() => {
    if (!meetingTitle.trim() || !meetingDate) {
      toast.error("Title and date are required");
      return;
    }
    createMeeting.mutate(
      {
        title: meetingTitle.trim(),
        scheduledAt: meetingDate,
        durationMinutes: Number(meetingDuration) || 30,
        attendees: meetingAttendees ? meetingAttendees.split(",").map(s => s.trim()).filter(Boolean) : [],
        agenda: meetingAgenda || undefined,
        notes: meetingNotes || undefined,
        actionItems: meetingActionItems || undefined,
        recordingLink: meetingRecordingLink || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Meeting added");
          setMeetingDialogOpen(false);
          setMeetingTitle(""); setMeetingDate(""); setMeetingDuration("30");
          setMeetingAttendees(""); setMeetingAgenda(""); setMeetingNotes("");
          setMeetingActionItems(""); setMeetingRecordingLink("");
        },
        onError: () => toast.error("Failed to add meeting"),
      }
    );
  }, [meetingTitle, meetingDate, meetingDuration, meetingAttendees, meetingAgenda, meetingNotes, meetingActionItems, meetingRecordingLink, createMeeting]);

  const handleDeleteMeeting = useCallback((meetingId: number) => {
    deleteMeeting.mutate(meetingId, {
      onSuccess: () => toast.success("Meeting removed"),
      onError: () => toast.error("Failed to remove meeting"),
    });
  }, [deleteMeeting]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[500px] lg:col-span-3" />
          <Skeleton className="h-[500px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Deal not found</p>
        <Button variant="outline" onClick={handleBackToDeals}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deals
        </Button>
      </div>
    );
  }

  const stageConfig = STAGES.find(s => s.key === deal.stage) ?? STAGES[0];
  const dealValue = Number(deal.value ?? 0);

  return (
    <PageWrapper
      title={deal.name}
      subtitle={formatINR(dealValue)}
      badge={
        <Badge
          className="text-sm px-3 py-1"
          style={{ backgroundColor: `${stageConfig.color}20`, color: stageConfig.color }}
        >
          {stageConfig.label}
        </Badge>
      }
      actions={
        <>
          <Button variant="ghost" size="icon" onClick={handleBackToDeals} aria-label="Back to deals">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {deal.probability !== null && (
            <Badge variant="secondary" className="text-xs">{deal.probability}% probability</Badge>
          )}
          <AIPredictDealButton dealId={dealId} compact />
          <Button variant="outline" size="sm" onClick={handleToggleEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          {deal.stage !== "WON" && deal.stage !== "LOST" && (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleMarkWon}>
                <Trophy className="h-4 w-4 mr-1" />
                Mark Won
              </Button>
              <Button size="sm" variant="destructive" onClick={handleMarkLost}>
                <XCircle className="h-4 w-4 mr-1" />
                Mark Lost
              </Button>
            </>
          )}
        </>
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="flex items-center gap-1 p-2 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const isActive = stage.key === deal.stage;
            const isPast = i < currentStageIndex;
            return (
              <button
                key={stage.key}
                data-stage={stage.key}
                onClick={handleStagePipelineClick}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  isActive ? cn(stage.bg, "ring-1 ring-current/20") :
                  isPast ? "bg-muted/50 text-muted-foreground" :
                  "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30",
                )}
                style={isActive ? { color: stage.color } : undefined}
              >
                {stage.label}
                {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />}
              </button>
            );
          })}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-5">
          <motion.div variants={fadeUp} className="lg:col-span-3 space-y-6">
            {isEditing ? (
              <DealEditForm
                deal={deal}
                isPending={updateDeal.isPending}
                onSubmit={onEditSubmit}
                onCancel={handleCancelEdit}
              />
            ) : (
              <Card className="shadow-noir">
                <CardHeader>
                  <CardTitle className="text-base">Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { icon: User, label: "Contact Person", value: deal.contactPerson },
                      { icon: Mail, label: "Contact Email", value: deal.contactEmail, href: deal.contactEmail ? `mailto:${deal.contactEmail}` : undefined },
                      { icon: Phone, label: "Contact Phone", value: deal.contactPhone, href: deal.contactPhone ? `tel:${deal.contactPhone}` : undefined },
                      { icon: Calendar, label: "Expected Close", value: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN") : null },
                      { icon: Calendar, label: "Actual Close", value: deal.actualCloseDate ? new Date(deal.actualCloseDate).toLocaleDateString("en-IN") : null },
                      { icon: Clock, label: "Probability", value: `${deal.probability ?? 0}%` },
                    ].map(item => (
                      <div key={item.label} className="flex items-start gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          {item.href ? (
                            <a href={item.href} className="text-sm text-gold hover:underline">{item.value || "\u2014"}</a>
                          ) : (
                            <p className="text-sm">{item.value || "\u2014"}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-gold/5 border border-border/50">
                    <p className="text-xs text-muted-foreground">Deal Value</p>
                    <p className="text-3xl font-bold text-gold">{formatINR(dealValue)}</p>
                    {deal.probability !== null && deal.probability > 0 && (
                      <div className="mt-2">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${deal.probability}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Weighted: {formatINR(Math.round(dealValue * (deal.probability / 100)))}
                        </p>
                      </div>
                    )}
                  </div>

                  {deal.notes && (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                      <Image
              src="/illustrations/undraw-online-survey.svg"
              alt="Empty state illustration"
              width={200}
              height={160}
              className="mx-auto mb-4 opacity-90"
            />
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
                    </div>
                  )}

                  {deal.lostReason && (
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <p className="text-xs text-red-400 mb-1">Lost Reason</p>
                      <p className="text-sm">{deal.lostReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
            {deal.assignedTo && (
              <Card className="shadow-noir">
                <CardHeader>
                  <CardTitle className="text-base">Assigned To</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center text-sm font-semibold text-gold">
                      {deal.assignedTo.name?.[0] ?? "?"}
                    </div>
                    <p className="text-sm font-medium">{deal.assignedTo.name}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {deal.lead && (
              <Card className="shadow-noir">
                <CardHeader>
                  <CardTitle className="text-base">Linked Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/crm/leads/${deal.lead.id}`} className="flex items-center gap-3 group">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-semibold text-blue-400">
                      {deal.lead.name?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-gold transition-colors">{deal.lead.name}</p>
                      {deal.lead.email && <p className="text-xs text-muted-foreground">{deal.lead.email}</p>}
                      {deal.lead.phone && <p className="text-xs text-muted-foreground">{deal.lead.phone}</p>}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {deal.client && (
              <Card className="shadow-noir">
                <CardHeader>
                  <CardTitle className="text-base">Linked Client</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-semibold text-emerald-400">
                      {deal.client.name?.[0] ?? "?"}
                    </div>
                    <p className="text-sm font-medium">{deal.client.name}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Created", value: deal.createdAt },
                  { label: "Updated", value: deal.updatedAt },
                  { label: "Expected Close", value: deal.expectedCloseDate },
                  { label: "Actual Close", value: deal.actualCloseDate },
                ]
                  .filter(d => d.value)
                  .map(d => (
                    <div key={d.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span>{new Date(d.value!).toLocaleDateString("en-IN")}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Log Call", icon: PhoneCall, type: "call" as const },
                    { label: "Add Note", icon: StickyNote, type: "note" as const },
                    { label: "Log Email", icon: Mail, type: "email" as const },
                    { label: "Log Meeting", icon: Video, type: "meeting" as const },
                  ].map(action => (
                    <Button
                      key={action.type}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 text-xs"
                      data-action-type={action.type}
                      data-action-label={action.label}
                      onClick={handleQuickActionClick}
                    >
                      <action.icon className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-noir">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-gold" />
                    Meetings
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setMeetingDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(!meetings || meetings.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                    <CalendarCheck className="h-6 w-6 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">No meetings recorded</p>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setMeetingDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Log a meeting
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[320px]">
                    <div className="space-y-3 pr-1">
                      {meetings.map((m: DealMeeting) => (
                        <div key={m.id} className="group p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-border/60 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{m.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(m.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {m.durationMinutes}m
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] ${m.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : m.status === "cancelled" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-400"}`}
                                >
                                  {m.status}
                                </Badge>
                              </div>
                              {m.attendees && m.attendees.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {m.attendees.join(", ")}
                                </div>
                              )}
                              {m.agenda && (
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{m.agenda}</p>
                              )}
                              {m.recordingLink && (
                                <a
                                  href={m.recordingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-gold hover:underline mt-1"
                                >
                                  <Link2 className="h-3 w-3" />
                                  Recording
                                </a>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                              onClick={() => handleDeleteMeeting(m.id)}
                              aria-label="Delete meeting"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {m.actionItems && (
                            <div className="mt-2 p-2 rounded bg-amber-500/5 border border-amber-500/10 text-xs">
                              <span className="text-amber-400 font-medium">Action items:</span>{" "}
                              <span className="text-muted-foreground">{m.actionItems}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline activities={activities ?? []} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Add Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="m-title">Title *</Label>
                <Input id="m-title" placeholder="e.g. Product demo call" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-date">Date & Time *</Label>
                <Input id="m-date" type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-dur">Duration (min)</Label>
                <Input id="m-dur" type="number" min={5} max={480} value={meetingDuration} onChange={e => setMeetingDuration(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-attendees">Attendees (comma separated)</Label>
              <Input id="m-attendees" placeholder="e.g. John, Sarah, Client Name" value={meetingAttendees} onChange={e => setMeetingAttendees(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-agenda">Agenda</Label>
              <Textarea id="m-agenda" rows={2} placeholder="Meeting objectives..." value={meetingAgenda} onChange={e => setMeetingAgenda(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-notes">Meeting Notes</Label>
              <Textarea id="m-notes" rows={3} placeholder="Key discussion points..." value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-actions">Action Items</Label>
              <Textarea id="m-actions" rows={2} placeholder="Follow-ups and next steps..." value={meetingActionItems} onChange={e => setMeetingActionItems(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-recording">Recording Link (optional)</Label>
              <Input id="m-recording" type="url" placeholder="https://..." value={meetingRecordingLink} onChange={e => setMeetingRecordingLink(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setMeetingDialogOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateMeeting} disabled={createMeeting.isPending}>
              {createMeeting.isPending ? "Saving..." : "Save Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogActivityDialog
        open={pendingAction !== null}
        actionLabel={pendingAction?.label ?? ""}
        isPending={logActivity.isPending}
        onClose={handleCloseLogDialog}
        onSubmit={handleLogActivity}
      />
    </PageWrapper>
  );
}
