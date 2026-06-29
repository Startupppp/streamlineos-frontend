"use client";

import { useState, useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useReferenceChecks,
  useCreateReferenceCheck,
  useUpdateReferenceCheck,
  useDeleteReferenceCheck,
} from "@/hooks/api/hr/recruitment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  Plus, Trash2, Mail, Phone, Building2, User2,
  CheckCircle2, Clock, XCircle, AlertCircle, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "DECLINED"] as const;
type ReferenceStatus = typeof STATUS_OPTIONS[number];

const STATUS_CONFIG: Record<
  ReferenceStatus,
  {
    label: string;
    icon: React.FC<{ className?: string }>;
    badgeClass: string;
    accentClass: string;
  }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    accentClass: "border-l-amber-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: AlertCircle,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
    accentClass: "border-l-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
    accentClass: "border-l-emerald-500",
  },
  DECLINED: {
    label: "Declined",
    icon: XCircle,
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
    accentClass: "border-l-rose-500",
  },
};

interface Props {
  candidateId: number;
}

export function ReferenceChecksTab({ candidateId }: Props) {
  const { data: checks, isLoading } = useReferenceChecks(candidateId);
  const createCheck = useCreateReferenceCheck(candidateId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [refName, setRefName] = useState("");
  const [refDesignation, setRefDesignation] = useState("");
  const [refCompany, setRefCompany] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = useCallback(() => {
    if (!refName.trim()) { toast.error("Reference name is required"); return; }
    createCheck.mutate(
      {
        referenceName: refName.trim(),
        referenceDesignation: refDesignation.trim() || undefined,
        referenceCompany: refCompany.trim() || undefined,
        referenceEmail: refEmail.trim() || undefined,
        referencePhone: refPhone.trim() || undefined,
        relationship: relationship.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Reference check added");
          setSheetOpen(false);
          setRefName("");
          setRefDesignation("");
          setRefCompany("");
          setRefEmail("");
          setRefPhone("");
          setRelationship("");
          setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [refName, refDesignation, refCompany, refEmail, refPhone, relationship, notes, createCheck]);

  const handleRefNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRefName(e.target.value), []);
  const handleRefDesignationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRefDesignation(e.target.value), []);
  const handleRefCompanyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRefCompany(e.target.value), []);
  const handleRefEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRefEmail(e.target.value), []);
  const handleRefPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRefPhone(e.target.value), []);
  const handleRelationshipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRelationship(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);
  const handleCancel = useCallback(() => setSheetOpen(false), []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {checks?.length ?? 0} reference{checks?.length !== 1 ? "s" : ""}
        </p>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Reference
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base font-semibold">Add Reference</SheetTitle>
              <SheetDescription className="text-xs">Add a professional reference contact to track verification.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">
                  Reference Name<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <Input placeholder="e.g. Rajesh Kumar" value={refName} onChange={handleRefNameChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Designation</label>
                  <Input placeholder="e.g. VP Engineering" value={refDesignation} onChange={handleRefDesignationChange} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Company</label>
                  <Input placeholder="e.g. Infosys" value={refCompany} onChange={handleRefCompanyChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Email</label>
                  <Input type="email" placeholder="ref@company.com" value={refEmail} onChange={handleRefEmailChange} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Phone</label>
                  <Input placeholder="+91 98..." value={refPhone} onChange={handleRefPhoneChange} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Relationship</label>
                <Input placeholder="e.g. Direct Manager, Team Lead" value={relationship} onChange={handleRelationshipChange} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Notes</label>
                <Textarea placeholder="Any additional context or notes..." value={notes} onChange={handleNotesChange} rows={3} />
              </div>
            </div>
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1 h-9" onClick={handleCancel}>Cancel</Button>
              <Button className="flex-1 h-9" onClick={handleCreate} disabled={createCheck.isPending}>
                {createCheck.isPending ? "Adding..." : "Add Reference"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {!checks?.length ? (
        <EmptyState
          illustration={<Users className="h-8 w-8 text-muted-foreground" />}
          title="No reference checks yet"
          description="Add professional references to verify this candidate's background."
          compact
        />
      ) : (
        <div className="space-y-3">
          {checks.map((check) => (
            <ReferenceCheckCard key={check.id} check={check} candidateId={candidateId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReferenceCheckCard({
  check,
  candidateId,
}: {
  check: {
    id: number;
    referenceName: string;
    referenceDesignation: string | null;
    referenceCompany: string | null;
    referenceEmail: string | null;
    referencePhone: string | null;
    relationship: string | null;
    status: string;
    outcome: string | null;
    notes: string | null;
  };
  candidateId: number;
}) {
  const updateCheck = useUpdateReferenceCheck(candidateId, check.id);
  const deleteCheck = useDeleteReferenceCheck(candidateId, check.id);

  const status = (check.status as ReferenceStatus) in STATUS_CONFIG ? (check.status as ReferenceStatus) : "PENDING";
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  const handleStatusChange = useCallback((newStatus: string) => {
    updateCheck.mutate(
      { status: newStatus as ReferenceStatus },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [updateCheck]);

  const handleDelete = useCallback(() => {
    deleteCheck.mutate(undefined, {
      onSuccess: () => toast.success("Reference removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteCheck]);

  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 transition-colors duration-200",
      cfg.accentClass
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{check.referenceName}</p>
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.badgeClass)}>
                <Icon className="h-2.5 w-2.5" />
                {cfg.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {check.referenceDesignation && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <User2 className="h-3 w-3 shrink-0" />
                  {check.referenceDesignation}
                </span>
              )}
              {check.referenceCompany && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {check.referenceCompany}
                </span>
              )}
              {check.referenceEmail && (
                <a
                  href={`mailto:${check.referenceEmail}`}
                  className="text-[11px] text-primary flex items-center gap-1 hover:underline"
                >
                  <Mail className="h-3 w-3 shrink-0" />
                  {check.referenceEmail}
                </a>
              )}
              {check.referencePhone && (
                <a
                  href={`tel:${check.referencePhone}`}
                  className="text-[11px] text-muted-foreground flex items-center gap-1 hover:underline"
                >
                  <Phone className="h-3 w-3 shrink-0" />
                  {check.referencePhone}
                </a>
              )}
            </div>

            {check.relationship && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Relationship:{" "}
                <span className="text-foreground font-medium">{check.relationship}</span>
              </p>
            )}

            {check.notes && (
              <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {check.notes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Select value={status} onValueChange={handleStatusChange} disabled={updateCheck.isPending}>
              <SelectTrigger className="h-7 text-xs w-[118px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors duration-200"
              disabled={deleteCheck.isPending}
              onClick={handleDelete}
              aria-label="Remove reference"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
