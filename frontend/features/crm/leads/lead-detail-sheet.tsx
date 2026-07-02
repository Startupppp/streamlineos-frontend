"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Target,
  ArrowRight,
  Edit3,
  AlarmClock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useLeadDetail, useLogLeadActivity } from "@/hooks/api";
import { toast } from "sonner";
import {
  STATUSES,
  STATUS_CONFIG,
  isActivityType,
  getInitials,
} from "./leads-constants";
import type { LeadStatus } from "./leads-types";
import { ActivityForm } from "./activity-form";
import { AIScoreButton } from "./ai-score-button";
import { AIEmailDialog } from "./ai-email-dialog";
import { AINextActionButton } from "./ai-next-action-button";
import { AIEnrichLeadButton } from "./ai-enrich-lead-button";
import { LeadActivityTab } from "./lead-activity-tab";
import { LeadInfoTab } from "./lead-info-tab";
import { LeadFollowupTab } from "./lead-followup-tab";

interface LeadDetailSheetProps {
  leadId: number | null;
  open: boolean;
  onClose: () => void;
  onMoveStatus: (leadId: number, status: LeadStatus) => void;
}

interface StatusMoveButtonProps {
  status: LeadStatus;
  leadId: number;
  onMoveStatus: (leadId: number, status: LeadStatus) => void;
}

function StatusMoveButton({
  status: s,
  leadId,
  onMoveStatus,
}: StatusMoveButtonProps) {
  const handleClick = useCallback(
    () => onMoveStatus(leadId, s),
    [leadId, s, onMoveStatus],
  );
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "text-xs h-8 gap-1.5",
        STATUS_CONFIG[s].border,
        "hover:bg-muted/50",
      )}
      onClick={handleClick}
    >
      <ArrowRight className="h-3 w-3" />
      {STATUS_CONFIG[s].label}
    </Button>
  );
}

export function LeadDetailSheet({
  leadId,
  open,
  onClose,
  onMoveStatus,
}: LeadDetailSheetProps) {
  const router = useRouter();
  const { data: lead, isLoading } = useLeadDetail(leadId ?? 0);
  const logActivity = useLogLeadActivity();
  const [activityTab, setActivityTab] = useState("details");

  const handleEditLead = useCallback(() => {
    if (!leadId) return;
    onClose();
    router.push(`/crm/leads/${leadId}`);
  }, [leadId, onClose, router]);

  const handleLogActivity = useCallback(
    async (formData: FormData) => {
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
          duration: formData.get("duration")
            ? Number(formData.get("duration"))
            : undefined,
          subject: (formData.get("subject") as string) || undefined,
          notes: (formData.get("activityNotes") as string) || undefined,
          outcome: (formData.get("outcome") as string) || undefined,
          location: (formData.get("location") as string) || undefined,
          messageSummary:
            (formData.get("messageSummary") as string) || undefined,
        });
        toast.success("Activity logged");
      } catch {
        toast.error("Failed to log activity");
      }
    },
    [leadId, logActivity],
  );

  const handleSheetClose = useCallback(
    (o: boolean) => {
      if (!o) onClose();
    },
    [onClose],
  );

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {isLoading || !lead ? (
          <div className="space-y-4 px-6 py-5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <SheetHeader className="p-0">
                    <SheetTitle className="text-xl font-semibold">
                      {lead.name}
                    </SheetTitle>
                  </SheetHeader>
                  {lead.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{lead.company}</span>
                      {lead.designation && (
                        <span className="text-muted-foreground/60">
                          · {lead.designation}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditLead}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Badge
                    className={cn(
                      "shrink-0",
                      STATUS_CONFIG[lead.status as LeadStatus]?.bg,
                      STATUS_CONFIG[lead.status as LeadStatus]?.color,
                      STATUS_CONFIG[lead.status as LeadStatus]?.border,
                      "border",
                    )}
                  >
                    {STATUS_CONFIG[lead.status as LeadStatus]?.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  AI Tools
                </p>
                <div className="flex gap-2 flex-wrap items-center">
                  <AIScoreButton
                    leadId={lead.id}
                    currentScore={lead.score}
                    compact
                  />
                  <AINextActionButton leadId={lead.id} compact />
                  <AIEmailDialog
                    leadName={lead.name}
                    company={lead.company}
                    designation={lead.designation}
                    potentialValue={lead.potentialValue ?? undefined}
                  />
                  <AIEnrichLeadButton
                    leadName={lead.name}
                    company={lead.company}
                    email={lead.email}
                    designation={lead.designation}
                    city={lead.city}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Move to
                </p>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.filter(
                    (s) => s !== lead.status && s !== "LOST",
                  ).map((s) => (
                    <StatusMoveButton
                      key={s}
                      status={s}
                      leadId={lead.id}
                      onMoveStatus={onMoveStatus}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline truncate text-sm"
                      >
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <a
                        href={`tel:${lead.phone}`}
                        className="hover:underline text-sm"
                      >
                        {lead.phone}
                      </a>
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
                      <span className="capitalize">
                        {lead.source.replace("_", "")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {(lead.potentialValue || lead.investmentInterest) && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Financials
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {lead.potentialValue && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                        <p className="text-[11px] text-muted-foreground mb-1">
                          Potential Value
                        </p>
                        <p className="text-lg font-bold text-emerald-400">
                          ₹{Number(lead.potentialValue).toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                    {lead.investmentInterest && (
                      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                        <p className="text-[11px] text-muted-foreground mb-1">
                          Investment Interest
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          ₹
                          {Number(lead.investmentInterest).toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {lead.assignedTo && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assigned To
                  </p>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={resolveImageUrl(lead.assignedTo.image)}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(lead.assignedTo.name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {lead.assignedTo.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.assignedTo.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {lead.notes && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Notes
                  </p>
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border/30">
                    <p className="text-sm leading-relaxed">{lead.notes}</p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Tabs value={activityTab} onValueChange={setActivityTab}>
                  <TabsList className="w-full h-10">
                    <TabsTrigger value="details" className="flex-1 text-xs">
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1 text-xs">
                      Activity
                    </TabsTrigger>
                    <TabsTrigger
                      value="new-activity"
                      className="flex-1 text-xs"
                    >
                      Log
                    </TabsTrigger>
                    <TabsTrigger
                      value="follow-up"
                      className="flex-1 text-xs gap-1"
                    >
                      <AlarmClock className="h-3 w-3 shrink-0" />
                      Follow-up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-5">
                    <LeadInfoTab
                      createdAt={lead.createdAt}
                      assignedAt={lead.assignedAt}
                      convertedAt={lead.convertedAt}
                      campaign={lead.campaign}
                    />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-5">
                    <LeadActivityTab activities={lead.activities ?? []} />
                  </TabsContent>

                  <TabsContent value="new-activity" className="mt-5">
                    <ActivityForm
                      onSubmit={handleLogActivity}
                      isPending={logActivity.isPending}
                    />
                  </TabsContent>

                  <TabsContent value="follow-up" className="mt-4">
                    <LeadFollowupTab leadId={lead.id} />
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
