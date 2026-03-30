"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Phone, Mail, MessageSquare, StickyNote, ListTodo,
  Calendar, Building2, Target, Clock, User, Edit2, ChevronRight,
  Flame, AlertTriangle, CheckCircle2, ArrowRightCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { api } from "@/trpc/react";
import { toast } from "sonner";

const STATUS_PIPELINE = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
type PipelineStatus = typeof STATUS_PIPELINE[number];

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  NEW: { color: "text-blue-400", bg: "bg-blue-500/15" },
  CONTACTED: { color: "text-sky-400", bg: "bg-sky-500/15" },
  INTERESTED: { color: "text-amber-400", bg: "bg-amber-500/15" },
  QUALIFIED: { color: "text-purple-400", bg: "bg-purple-500/15" },
  CONVERTED: { color: "text-emerald-400", bg: "bg-emerald-500/15" },
  LOST: { color: "text-red-400", bg: "bg-red-500/15" },
};

const PRIORITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  HOT: { label: "Hot", color: "text-red-400", bg: "bg-red-500/15" },
  WARM: { label: "Warm", color: "text-amber-400", bg: "bg-amber-500/15" },
  COLD: { label: "Cold", color: "text-blue-400", bg: "bg-blue-500/15" },
};

const TIMELINE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  note: { icon: StickyNote, color: "bg-amber-500/15 text-amber-400" },
  task: { icon: ListTodo, color: "bg-purple-500/15 text-purple-400" },
  email: { icon: Mail, color: "bg-blue-500/15 text-blue-400" },
  activity: { icon: Phone, color: "bg-green-500/15 text-green-400" },
};

type QuickAction = "call" | "email" | "note" | "task" | null;

const noteSchema = z.object({ body: z.string().min(1, "Note cannot be empty") });
type NoteForm = z.infer<typeof noteSchema>;

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  dueDate: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

const emailSchema = z.object({
  to: z.string().email("Valid email required"),
  subject: z.string().min(1, "Subject required"),
  body: z.string().min(1, "Body required"),
});
type EmailForm = z.infer<typeof emailSchema>;

const callSchema = z.object({
  subject: z.string().optional(),
  duration: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});
type CallForm = z.infer<typeof callSchema>;

const editSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  potentialValue: z.string().optional(),
  investmentInterest: z.string().optional(),
  notes: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

function getScoreBadge(score: number | null | undefined) {
  const s = score ?? 0;
  if (s <= 30) return { label: "Low", color: "text-red-400", bg: "bg-red-500/15" };
  if (s <= 60) return { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/15" };
  return { label: "Hot", color: "text-emerald-400", bg: "bg-emerald-500/15" };
}

function getSlaCountdown(deadline: Date | string | null | undefined) {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0) return { label: "Breached", color: "text-red-400 bg-red-500/15" };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 4) return { label: `${hours}h ${mins}m left`, color: "text-amber-400 bg-amber-500/15" };
  return { label: `${hours}h ${mins}m left`, color: "text-emerald-400 bg-emerald-500/15" };
}

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId: leadIdStr } = use(params);
  const leadId = Number(leadIdStr);
  const router = useRouter();
  const utils = api.useUtils();

  const { data: lead, isLoading } = api.leads.getById.useQuery({ id: leadId });
  const { data: timeline, isLoading: timelineLoading } = api.leadDetails.getTimeline.useQuery(
    { leadId, limit: 50 },
    { enabled: !!leadId }
  );

  const [isEditing, setIsEditing] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);

  const updateLead = api.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: leadId });
      toast.success("Lead updated");
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = api.leads.updateStatus.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: leadId });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const createNote = api.leadDetails.createNote.useMutation({
    onSuccess: () => {
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Note added");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const createTask = api.leadDetails.createTask.useMutation({
    onSuccess: () => {
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Task created");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendEmailMutation = api.leadDetails.sendEmail.useMutation({
    onSuccess: () => {
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Email sent");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const logActivity = api.leads.logActivity.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: leadId });
      utils.leadDetails.getTimeline.invalidate({ leadId });
      toast.success("Call logged");
      setActiveAction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: lead ? {
      name: lead.name,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      city: lead.city ?? "",
      priority: (lead.priority as "HOT" | "WARM" | "COLD") ?? "WARM",
      potentialValue: lead.potentialValue ?? "",
      investmentInterest: lead.investmentInterest ?? "",
      notes: lead.notes ?? "",
    } : undefined,
  });

  const noteForm = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });
  const taskForm = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { to: lead?.email ?? "" },
  });
  const callForm = useForm<CallForm>({ resolver: zodResolver(callSchema) });

  const handleStatusChange = useCallback((status: PipelineStatus) => {
    updateStatus.mutate({ 
      leadId, 
      status, 
      expectedStatus: (lead as any)?.status as PipelineStatus 
    });
  }, [leadId, updateStatus, lead]);

  const onEditSubmit = useCallback((data: EditForm) => {
    updateLead.mutate({ id: leadId, ...data });
  }, [leadId, updateLead]);

  const onNoteSubmit = useCallback((data: NoteForm) => {
    createNote.mutate({ leadId, body: data.body });
    noteForm.reset();
  }, [leadId, createNote, noteForm]);

  const onTaskSubmit = useCallback((data: TaskForm) => {
    createTask.mutate({ leadId, title: data.title, dueDate: data.dueDate || undefined });
    taskForm.reset();
  }, [leadId, createTask, taskForm]);

  const onEmailSubmit = useCallback((data: EmailForm) => {
    sendEmailMutation.mutate({ leadId, to: data.to, subject: data.subject, body: data.body });
  }, [leadId, sendEmailMutation]);

  const onCallSubmit = useCallback((data: CallForm) => {
    logActivity.mutate({
      leadId,
      type: "call",
      date: new Date().toISOString(),
      subject: data.subject || undefined,
      duration: data.duration ? Number(data.duration) : undefined,
      outcome: data.outcome || undefined,
      notes: data.notes || undefined,
    });
    callForm.reset();
  }, [leadId, logActivity, callForm]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[600px] lg:col-span-3" />
          <Skeleton className="h-[600px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" onClick={() => router.push("/crm/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pipeline
        </Button>
      </div>
    );
  }

  const currentStatusIndex = STATUS_PIPELINE.indexOf(lead.status as PipelineStatus);
  const scoreBadge = getScoreBadge((lead as Record<string, unknown>).score as number | null);
  const sla = getSlaCountdown((lead as Record<string, unknown>).slaDeadline as string | null);
  const priorityStyle = PRIORITY_STYLES[lead.priority ?? "WARM"] ?? PRIORITY_STYLES.WARM;

  return (
    <motion.div
      className="space-y-6 p-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{lead.name}</h1>
          {lead.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3.5 w-3.5" /> {lead.company}
              {lead.designation && <span className="ml-1">- {lead.designation}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-xs px-2 py-0.5", scoreBadge.bg, scoreBadge.color)}>
            <Flame className="h-3 w-3 mr-1" />
            Score: {String((lead as Record<string, unknown>).score ?? 0)} ({scoreBadge.label})
          </Badge>
          {sla && (
            <Badge className={cn("text-xs px-2 py-0.5", sla.color)}>
              <Clock className="h-3 w-3 mr-1" />
              SLA: {sla.label}
            </Badge>
          )}
          <Badge className={cn("text-xs px-2 py-0.5", priorityStyle.bg, priorityStyle.color)}>
            {priorityStyle.label}
          </Badge>
          <Badge className={cn("text-sm px-3 py-1", STATUS_STYLES[lead.status]?.bg, STATUS_STYLES[lead.status]?.color)}>
            {lead.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleStatusChange("CONVERTED")}
            >
              <ArrowRightCircle className="h-4 w-4 mr-1" />
              Convert to Deal
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-1 p-2 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto">
        {STATUS_PIPELINE.map((status, i) => {
          const isActive = status === lead.status;
          const isPast = i < currentStatusIndex;
          const style = STATUS_STYLES[status];
          return (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                isActive ? cn(style.bg, style.color, "ring-1 ring-current/20") :
                isPast ? "bg-muted/50 text-muted-foreground" :
                "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
              )}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
              {i < STATUS_PIPELINE.length - 1 && <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />}
            </button>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div variants={fadeUp} className="lg:col-span-3 space-y-6">
          {isEditing ? (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Edit Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={editForm.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="company" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="priority" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="HOT">Hot</SelectItem>
                              <SelectItem value="WARM">Warm</SelectItem>
                              <SelectItem value="COLD">Cold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="potentialValue" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Potential Value</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="investmentInterest" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Investment Interest</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="col-span-2">
                        <FormField control={editForm.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea {...field} rows={3} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit" className="bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={updateLead.isPending}>
                        {updateLead.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: Mail, label: "Email", value: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
                    { icon: Phone, label: "Phone", value: lead.phone, href: lead.phone ? `tel:${lead.phone}` : undefined },
                    { icon: MessageSquare, label: "WhatsApp", value: lead.whatsappNumber },
                    { icon: Building2, label: "Company", value: lead.company },
                    { icon: Target, label: "Source", value: lead.source?.replace("_", " ") },
                    { icon: User, label: "City", value: lead.city },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-sm text-[#bd882c] hover:underline">{item.value || "\u2014"}</a>
                        ) : (
                          <p className="text-sm capitalize">{item.value || "\u2014"}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {(lead.potentialValue || lead.investmentInterest) && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-[#bd882c]/5 border border-border/50">
                    {lead.potentialValue && (
                      <div>
                        <p className="text-xs text-muted-foreground">Potential Value</p>
                        <p className="text-xl font-bold text-emerald-400">{"\u20B9"}{Number(lead.potentialValue).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                    {lead.investmentInterest && (
                      <div>
                        <p className="text-xs text-muted-foreground">Investment Interest</p>
                        <p className="text-xl font-bold text-[#bd882c]">{"\u20B9"}{Number(lead.investmentInterest).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                  </div>
                )}

                {lead.notes && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}

                {lead.tags && (lead.tags as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.tags as string[]).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "call" as const, label: "Log Call", icon: Phone, color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" },
                  { key: "email" as const, label: "Send Email", icon: Mail, color: "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20" },
                  { key: "note" as const, label: "Add Note", icon: StickyNote, color: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" },
                  { key: "task" as const, label: "New Task", icon: ListTodo, color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
                ].map(action => (
                  <Button
                    key={action.key}
                    variant="ghost"
                    size="sm"
                    className={cn(action.color, activeAction === action.key && "ring-2 ring-current/30")}
                    onClick={() => setActiveAction(activeAction === action.key ? null : action.key)}
                  >
                    <action.icon className="h-4 w-4 mr-1.5" />
                    {action.label}
                  </Button>
                ))}
              </div>

              {activeAction === "note" && (
                <Form {...noteForm}>
                  <form onSubmit={noteForm.handleSubmit(onNoteSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
                    <FormField control={noteForm.control} name="body" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Write a note..." rows={3} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setActiveAction(null)}>Cancel</Button>
                      <Button type="submit" size="sm" className="bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={createNote.isPending}>
                        {createNote.isPending ? "Saving..." : "Save Note"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {activeAction === "task" && (
                <Form {...taskForm}>
                  <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
                    <FormField control={taskForm.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl><Input {...field} placeholder="Follow up with..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={taskForm.control} name="dueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setActiveAction(null)}>Cancel</Button>
                      <Button type="submit" size="sm" className="bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={createTask.isPending}>
                        {createTask.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {activeAction === "email" && (
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
                    <FormField control={emailForm.control} name="to" render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <FormControl><Input {...field} placeholder="email@example.com" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={emailForm.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl><Input {...field} placeholder="Subject" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={emailForm.control} name="body" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Email body..." rows={4} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setActiveAction(null)}>Cancel</Button>
                      <Button type="submit" size="sm" className="bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={sendEmailMutation.isPending}>
                        {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {activeAction === "call" && (
                <Form {...callForm}>
                  <form onSubmit={callForm.handleSubmit(onCallSubmit)} className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
                    <FormField control={callForm.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl><Input {...field} placeholder="Brief description" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={callForm.control} name="duration" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (min)</FormLabel>
                          <FormControl><Input type="number" {...field} placeholder="30" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={callForm.control} name="outcome" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outcome</FormLabel>
                          <FormControl><Input {...field} placeholder="Positive / Follow up" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={callForm.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl><Textarea {...field} rows={2} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setActiveAction(null)}>Cancel</Button>
                      <Button type="submit" size="sm" className="bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={logActivity.isPending}>
                        {logActivity.isPending ? "Logging..." : "Log Call"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
          {lead.assignedTo && (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#bd882c]/10 flex items-center justify-center text-sm font-semibold text-[#bd882c]">
                    {lead.assignedTo.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.assignedTo.email}</p>
                  </div>
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
                { label: "Created", value: lead.createdAt },
                { label: "Updated", value: lead.updatedAt },
                { label: "Assigned", value: lead.assignedAt },
                { label: "Converted", value: lead.convertedAt },
              ]
                .filter(d => d.value)
                .map(d => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span>{new Date(d.value!).toLocaleDateString()}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : timeline && timeline.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border/50" />
                    <div className="space-y-4">
                      {timeline.map((item) => {
                        const config = TIMELINE_ICONS[item.type] ?? TIMELINE_ICONS.note;
                        const ItemIcon = config.icon;
                        const data = item.data as Record<string, unknown>;
                        return (
                          <div key={`${item.type}-${item.id}`} className="relative flex gap-4 pl-10">
                            <div className={cn("absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center", config.color)}>
                              <ItemIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 p-3 rounded-lg bg-muted/20 border border-border/30">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium capitalize">{item.type}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ""}
                                </span>
                              </div>
                              {item.type === "note" && (
                                <p className="text-sm mt-1">{String(data.body ?? "")}</p>
                              )}
                              {item.type === "task" && (
                                <div className="mt-1">
                                  <p className="text-sm">{String(data.title ?? "")}</p>
                                  {typeof data.status === "string" && data.status && (
                                    <Badge variant="secondary" className="text-[10px] mt-1">
                                      {data.status}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {item.type === "email" && (
                                <div className="mt-1">
                                  <p className="text-sm font-medium">{String(data.subject ?? "")}</p>
                                  <p className="text-xs text-muted-foreground">{String(data.direction ?? "sent")} - {String(data.toEmail ?? "")}</p>
                                </div>
                              )}
                              {item.type === "activity" && (
                                <div className="mt-1">
                                  {data.subject ? <p className="text-sm">{String(data.subject)}</p> : null}
                                  {data.notes ? <p className="text-xs text-muted-foreground mt-0.5">{String(data.notes)}</p> : null}
                                </div>
                              )}
                              {data.author ? (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <User className="h-3 w-3" /> {String((data.author as Record<string, unknown>).name ?? "")}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground/60">
                  <p className="text-sm">No activities recorded yet</p>
                  <p className="text-xs mt-1">Log your first interaction with this lead</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
