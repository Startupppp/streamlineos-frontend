"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, Mail, MessageSquare, MapPin, Calendar,
  Building2, Target, Clock, User, Edit2, Trash2, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadDetail, useUpdateLead, useUpdateLeadStatus, useLogLeadActivity } from "@/lib/hooks/trpc-hooks";
import { toast } from "sonner";

const STATUS_PIPELINE = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  NEW: { color: "text-blue-400", bg: "bg-blue-500/15" },
  CONTACTED: { color: "text-sky-400", bg: "bg-sky-500/15" },
  INTERESTED: { color: "text-amber-400", bg: "bg-amber-500/15" },
  QUALIFIED: { color: "text-purple-400", bg: "bg-purple-500/15" },
  CONVERTED: { color: "text-emerald-400", bg: "bg-emerald-500/15" },
  LOST: { color: "text-red-400", bg: "bg-red-500/15" },
};

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  call: { icon: Phone, color: "bg-blue-500/15 text-blue-400" },
  email: { icon: Mail, color: "bg-purple-500/15 text-purple-400" },
  whatsapp: { icon: MessageSquare, color: "bg-green-500/15 text-green-400" },
  meeting: { icon: Calendar, color: "bg-amber-500/15 text-amber-400" },
  site_visit: { icon: MapPin, color: "bg-cyan-500/15 text-cyan-400" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = Number(params.id);
  const { data: lead, isLoading } = useLeadDetail(leadId);
  const updateLead = useUpdateLead();
  const updateStatus = useUpdateLeadStatus();
  const logActivity = useLogLeadActivity();
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusChange = useCallback(async (status: typeof STATUS_PIPELINE[number]) => {
    try {
      await updateStatus.mutateAsync({ leadId, status });
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }, [leadId, updateStatus]);

  const handleEditSave = useCallback(async (formData: FormData) => {
    try {
      await updateLead.mutateAsync({
        id: leadId,
        name: formData.get("name") as string,
        email: formData.get("email") as string || undefined,
        phone: formData.get("phone") as string || undefined,
        company: formData.get("company") as string || undefined,
        city: formData.get("city") as string || undefined,
        notes: formData.get("notes") as string || undefined,
        potentialValue: formData.get("potentialValue") as string || undefined,
        investmentInterest: formData.get("investmentInterest") as string || undefined,
      });
      toast.success("Lead updated");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update lead");
    }
  }, [leadId, updateLead]);

  const handleLogActivity = useCallback(async (formData: FormData) => {
    try {
      await logActivity.mutateAsync({
        leadId,
        type: formData.get("type") as any,
        date: new Date().toISOString(),
        duration: formData.get("duration") ? Number(formData.get("duration")) : undefined,
        subject: formData.get("subject") as string || undefined,
        notes: formData.get("notes") as string || undefined,
        outcome: formData.get("outcome") as string || undefined,
        location: formData.get("location") as string || undefined,
      });
      toast.success("Activity logged");
    } catch {
      toast.error("Failed to log activity");
    }
  }, [leadId, logActivity]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
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

  const currentStatusIndex = STATUS_PIPELINE.indexOf(lead.status as any);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")} aria-label="Back to pipeline">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          {lead.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3.5 w-3.5" /> {lead.company}
              {lead.designation && <span className="ml-1">· {lead.designation}</span>}
            </p>
          )}
        </div>
        <Badge className={cn("text-sm px-3 py-1", STATUS_STYLES[lead.status]?.bg, STATUS_STYLES[lead.status]?.color)}>
          {lead.status}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
          <Edit2 className="h-4 w-4 mr-1" />
          {isEditing ? "Cancel" : "Edit"}
        </Button>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Edit Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={handleEditSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={lead.name} required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" defaultValue={lead.email ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" defaultValue={lead.phone ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" name="company" defaultValue={lead.company ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" defaultValue={lead.city ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="potentialValue">Potential Value</Label>
                      <Input id="potentialValue" name="potentialValue" defaultValue={lead.potentialValue ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="investmentInterest">Investment Interest</Label>
                      <Input id="investmentInterest" name="investmentInterest" defaultValue={lead.investmentInterest ?? ""} />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea id="notes" name="notes" defaultValue={lead.notes ?? ""} rows={3} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button type="submit" className="bg-gold hover:bg-gold/90 text-white" disabled={updateLead.isPending}>
                      {updateLead.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
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
                    { icon: MapPin, label: "City", value: lead.city },
                    { icon: Target, label: "Source", value: lead.source?.replace("_", " ") },
                    { icon: Building2, label: "Company", value: lead.company },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-sm text-gold hover:underline">{item.value || "\u2014"}</a>
                        ) : (
                          <p className="text-sm capitalize">{item.value || "\u2014"}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {(lead.potentialValue || lead.investmentInterest) && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-gold/5 border border-border/50">
                    {lead.potentialValue && (
                      <div>
                        <p className="text-xs text-muted-foreground">Potential Value</p>
                        <p className="text-xl font-bold text-emerald-400">\u20B9{Number(lead.potentialValue).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                    {lead.investmentInterest && (
                      <div>
                        <p className="text-xs text-muted-foreground">Investment Interest</p>
                        <p className="text-xl font-bold text-gold">\u20B9{Number(lead.investmentInterest).toLocaleString("en-IN")}</p>
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
              </CardContent>
            </Card>
          )}

          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.activities && lead.activities.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border/50" />
                  <div className="space-y-4">
                    {lead.activities.map((activity: any) => {
                      const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.call;
                      const ActivityIcon = config.icon;
                      return (
                        <div key={activity.id} className="relative flex gap-4 pl-10">
                          <div className={cn("absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center", config.color)}>
                            <ActivityIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 p-3 rounded-lg bg-muted/20 border border-border/30">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">{activity.type.replace("_", " ")}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(activity.date).toLocaleDateString()} {new Date(activity.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {activity.subject && <p className="text-xs text-muted-foreground mt-0.5">{activity.subject}</p>}
                            {activity.notes && <p className="text-sm mt-1">{activity.notes}</p>}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {activity.duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {activity.duration} min
                                </span>
                              )}
                              {activity.outcome && (
                                <Badge variant="outline" className="text-[10px]">{activity.outcome}</Badge>
                              )}
                              {activity.user && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" /> {activity.user.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground/60">
                  <p className="text-sm">No activities recorded yet</p>
                  <p className="text-xs mt-1">Log your first interaction with this lead</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-6">
          {lead.assignedTo && (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                    <AvatarFallback>{getInitials(lead.assignedTo.name ?? "")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.assignedTo.email}</p>
                  </div>
                </div>
                {lead.assignedAt && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Assigned on {new Date(lead.assignedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Quick Log Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleLogActivity} className="space-y-3">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    name="type"
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
                <div>
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input id="duration" name="duration" type="number" placeholder="30" />
                </div>
                <div>
                  <Label htmlFor="outcome">Outcome</Label>
                  <Input id="outcome" name="outcome" placeholder="Positive / Follow up needed" />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} placeholder="Details..." />
                </div>
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={logActivity.isPending}>
                  {logActivity.isPending ? "Logging..." : "Log Activity"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "\u2014"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : "\u2014"}</span>
              </div>
              {lead.assignedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigned</span>
                  <span>{new Date(lead.assignedAt).toLocaleDateString()}</span>
                </div>
              )}
              {lead.convertedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Converted</span>
                  <span className="text-emerald-400">{new Date(lead.convertedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}