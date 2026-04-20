"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyPersonIllustration } from "@/components/illustrations";
import Link from "next/link";
import { useCandidates, useCreateCandidate, useUpdateCandidate, useUpdateCandidateStage, useDeleteCandidate, useBulkRejectCandidates } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Mail, Phone, Building2, Star, XCircle, CheckSquare, GitCompare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Candidate, CandidateStatus } from "@/types/hr";
import { AIScoreCandidateButton } from "@/features/hr/recruitment/ai-score-candidate-button";
import { CandidateComparisonDialog } from "@/components/hr/recruitment/candidate-comparison-dialog";

const STATUSES: { value: CandidateStatus; label: string; color: string }[] = [
  { value: "NEW", label: "New", color: "bg-blue-500" },
  { value: "SCREENING", label: "Screening", color: "bg-yellow-500" },
  { value: "INTERVIEW", label: "Interview", color: "bg-purple-500" },
  { value: "OFFER", label: "Offer", color: "bg-orange-500" },
  { value: "HIRED", label: "Hired", color: "bg-green-500" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-500" },
];

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  REFERRAL: "Referral",
  LINKEDIN: "LinkedIn",
  JOB_PORTAL: "Job Portal",
  CAMPUS: "Campus",
  CAREERS_PAGE: "Careers Page",
  NAUKRI: "Naukri",
};

const SOURCE_BADGE_CLASSES: Record<string, string> = {
  LINKEDIN: "border-blue-300 text-blue-700 dark:text-blue-400",
  NAUKRI: "border-orange-300 text-orange-700 dark:text-orange-400",
  REFERRAL: "border-green-300 text-green-700 dark:text-green-400",
  CAMPUS: "border-purple-300 text-purple-700 dark:text-purple-400",
  JOB_PORTAL: "border-cyan-300 text-cyan-700 dark:text-cyan-400",
  CAREERS_PAGE: "border-primary/40 text-primary",
  DIRECT: "text-muted-foreground",
};

function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "HIRED": return "default";
    case "INTERVIEW": case "OFFER": return "secondary";
    case "REJECTED": return "destructive";
    default: return "outline";
  }
}

export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as CandidateStatus | null;
  const searchQuery = searchParams.get("q") ?? "";

  const { data: candidates, isLoading } = useCandidates(
    statusFilter ? { status: statusFilter } : undefined
  );
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const updateCandidateStage = useUpdateCandidateStage();
  const deleteCandidate = useDeleteCandidate();
  const bulkReject = useBulkRejectCandidates();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("DIRECT");

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCurrentRole, setEditCurrentRole] = useState("");
  const [editCurrentCompany, setEditCurrentCompany] = useState("");
  const [editLinkedinUrl, setEditLinkedinUrl] = useState("");
  const [editSource, setEditSource] = useState("DIRECT");
  const [editNotes, setEditNotes] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    if (!searchQuery) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.currentCompany?.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  const handleCreate = useCallback(() => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }
    createCandidate.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone || undefined, source },
      {
        onSuccess: () => {
          toast.success("Candidate added");
          setSheetOpen(false);
          setFirstName(""); setLastName(""); setEmail(""); setPhone("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [firstName, lastName, email, phone, source, createCandidate]);

  const handleStatusChange = useCallback(
    (id: number, status: CandidateStatus) => {
      updateCandidateStage.mutate({ candidateId: id, stage: status }, {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateCandidateStage]
  );

  const openEditSheet = useCallback((candidate: Candidate) => {
    setEditingCandidate(candidate);
    setEditFirstName(candidate.firstName);
    setEditLastName(candidate.lastName);
    setEditEmail(candidate.email);
    setEditPhone(candidate.phone ?? "");
    setEditCurrentRole(candidate.currentRole ?? "");
    setEditCurrentCompany(candidate.currentCompany ?? "");
    setEditLinkedinUrl(candidate.linkedinUrl ?? "");
    setEditSource(candidate.source ?? "DIRECT");
    setEditNotes(candidate.notes ?? "");
    setEditSheetOpen(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (!editingCandidate) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }
    updateCandidate.mutate(
      {
        id: editingCandidate.id,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
        currentRole: editCurrentRole.trim() || undefined,
        currentCompany: editCurrentCompany.trim() || undefined,
        linkedinUrl: editLinkedinUrl.trim() || undefined,
        source: editSource || undefined,
        notes: editNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Candidate updated");
          setEditSheetOpen(false);
          setEditingCandidate(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [editingCandidate, editFirstName, editLastName, editEmail, editPhone, editCurrentRole, editCurrentCompany, editLinkedinUrl, editSource, editNotes, updateCandidate]);

  const openDeleteDialog = useCallback((candidate: Candidate) => {
    setDeletingCandidate(candidate);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deletingCandidate) return;
    deleteCandidate.mutate(deletingCandidate.id, {
      onSuccess: () => {
        toast.success("Candidate deleted");
        setDeleteDialogOpen(false);
        setDeletingCandidate(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deletingCandidate.id);
          return next;
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deletingCandidate, deleteCandidate]);

  const handleToggleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredCandidates.map((c) => c.id);
    setSelectedIds((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  }, [filteredCandidates]);

  const handleBulkReject = useCallback(() => {
    bulkReject.mutate(
      { candidateIds: Array.from(selectedIds), sendRejectionEmail: true },
      {
        onSuccess: (res) => {
          toast.success(`${res.rejected} candidate(s) rejected, ${res.emailsSent} email(s) sent`);
          setSelectedIds(new Set());
          setBulkRejectOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [selectedIds, bulkReject]);

  if (isLoading) {
    return (
      <PageWrapper title="Candidates" subtitle="Manage your talent pipeline">
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Candidates"
      subtitle="Manage your talent pipeline"
      badge={`${filteredCandidates.length} candidates`}
      actions={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 h-8 text-xs"
                onClick={() => setBulkRejectOpen(true)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject Selected
              </Button>
              {selectedIds.size >= 2 && selectedIds.size <= 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setCompareOpen(true)}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare ({selectedIds.size})
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleSelectAll}
            title={selectedIds.size === filteredCandidates.length ? "Deselect all" : "Select all"}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0
              ? "Deselect all"
              : "Select all"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment">Back</Link>
          </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Candidate</Button></SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base">Add Candidate</SheetTitle>
              <SheetDescription className="text-xs">Add a new candidate to the pipeline.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">First Name</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Source</label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIRECT">Direct</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                      <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                      <SelectItem value="JOB_PORTAL">Job Portal</SelectItem>
                      <SelectItem value="CAMPUS">Campus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={createCandidate.isPending}>
                {createCandidate.isPending ? "Adding..." : "Add Candidate"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        </div>
      }
      filters={
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setFilter("q", e.target.value || null)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select value={statusFilter ?? "ALL"} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCandidates.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <EmptyPersonIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
              {searchQuery ? "No candidates match your search." : "No candidates yet. Add your first one!"}
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card
              key={candidate.id}
              className={`hover:border-primary/30 transition-colors relative ${selectedIds.has(candidate.id) ? "ring-2 ring-primary/40 border-primary/40" : ""}`}
            >
              <div
                className="absolute top-3 right-3 z-10 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEditSheet(candidate)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => openDeleteDialog(candidate)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Checkbox
                  checked={selectedIds.has(candidate.id)}
                  onCheckedChange={(checked) => handleToggleSelect(candidate.id, checked === true)}
                  aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                />
              </div>
              <Link href={`/hr/recruitment/candidates/${candidate.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2 pr-14">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    {candidate.currentRole && (
                      <p className="text-sm text-muted-foreground">
                        {candidate.currentRole}{candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{candidate.email}</div>
                  {candidate.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{candidate.phone}</div>}
                  {candidate.source && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      <Badge variant="outline" className={SOURCE_BADGE_CLASSES[candidate.source] ?? "text-muted-foreground"}>
                        {SOURCE_LABELS[candidate.source] ?? candidate.source}
                      </Badge>
                    </div>
                  )}
                  {candidate.rating && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < candidate.rating! ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {candidate.createdAt ? formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true }) : ""}
                  </span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <AIScoreCandidateButton candidateId={candidate.id} compact />
                    <Select
                      value={candidate.status ?? "NEW"}
                      onValueChange={(v) => handleStatusChange(candidate.id, v as CandidateStatus)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              </Link>
            </Card>
          ))
        )}
      </div>

      <ConfirmDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title={`Reject ${selectedIds.size} candidate(s)?`}
        description="This will move all selected candidates to Rejected and send automated rejection emails. This action cannot be undone."
        confirmLabel={bulkReject.isPending ? "Rejecting..." : `Reject ${selectedIds.size} Candidate(s)`}
        destructive
        onConfirm={handleBulkReject}
      />
      {compareOpen && (
        <CandidateComparisonDialog
          candidates={filteredCandidates.filter((c) => selectedIds.has(c.id))}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <Sheet open={editSheetOpen} onOpenChange={(open) => { setEditSheetOpen(open); if (!open) setEditingCandidate(null); }}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Edit Candidate</SheetTitle>
            <SheetDescription className="text-xs">
              Update details for {editingCandidate?.firstName} {editingCandidate?.lastName}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last Name <span className="text-destructive">*</span></label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Source</label>
                <Select value={editSource} onValueChange={setEditSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT">Direct</SelectItem>
                    <SelectItem value="REFERRAL">Referral</SelectItem>
                    <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                    <SelectItem value="JOB_PORTAL">Job Portal</SelectItem>
                    <SelectItem value="CAMPUS">Campus</SelectItem>
                    <SelectItem value="NAUKRI">Naukri</SelectItem>
                    <SelectItem value="CAREERS_PAGE">Careers Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current Role</label>
                <Input value={editCurrentRole} onChange={(e) => setEditCurrentRole(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current Company</label>
                <Input value={editCurrentCompany} onChange={(e) => setEditCurrentCompany(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">LinkedIn URL</label>
              <Input value={editLinkedinUrl} onChange={(e) => setEditLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes about this candidate..."
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditSheetOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleEdit} disabled={updateCandidate.isPending}>
              {updateCandidate.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeletingCandidate(null); }}
        title="Delete candidate?"
        description={`This will permanently delete ${deletingCandidate?.firstName} ${deletingCandidate?.lastName} along with all their interviews, applications, and tracking data. This action cannot be undone.`}
        confirmLabel={deleteCandidate.isPending ? "Deleting..." : "Delete Candidate"}
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
