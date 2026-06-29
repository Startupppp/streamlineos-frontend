"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRecruitmentVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useVendorSubmissions,
  useUpdateVendorSubmission,
  type RecruitmentVendor,
  type VendorSubmission,
  type CreateVendorInput,
  type UpdateVendorInput,
} from "@/hooks/api";

const HR_ROLES = ["CEO", "HR", "ADMIN", "HR_MANAGER"];

interface VendorSheetProps {
  initial?: RecruitmentVendor | null;
  onClose: () => void;
}

function VendorSheet({ initial, onClose }: VendorSheetProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [feePercent, setFeePercent] = useState(
    initial?.feePercent ? String(parseFloat(initial.feePercent)) : "",
  );
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    initial?.status ?? "ACTIVE",
  );

  const create = useCreateVendor();
  const update = useUpdateVendor(initial?.id ?? 0);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    const fee = feePercent ? parseFloat(feePercent) : undefined;
    if (fee !== undefined && (isNaN(fee) || fee < 0 || fee > 100)) {
      toast.error("Fee percent must be between 0 and 100");
      return;
    }
    const payload: CreateVendorInput & UpdateVendorInput = {
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      website: website.trim() || undefined,
      feePercent: fee,
      status,
    };

    if (initial) {
      update.mutate(payload, {
        onSuccess: () => {
          toast.success("Vendor updated");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Vendor added");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [
    name,
    contactName,
    contactEmail,
    contactPhone,
    website,
    feePercent,
    status,
    initial,
    create,
    update,
    onClose,
  ]);

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit Vendor" : "Add Vendor"}</SheetTitle>
          <SheetDescription>
            Staffing agency or recruitment vendor details
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <div className="space-y-1.5">
            <Label>
              Agency Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TalentBridge Inc."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Account manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="manager@agency.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fee %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://agency.com"
            />
          </div>
          {initial && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? "Saving..." : initial ? "Save Changes" : "Add Vendor"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface SubmissionSheetProps {
  vendor: RecruitmentVendor;
  onClose: () => void;
}

function SubmissionSheet({ vendor, onClose }: SubmissionSheetProps) {
  const { data: submissions = [], isLoading } = useVendorSubmissions(vendor.id);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  function StatusBadge({
    status,
  }: {
    status: VendorSubmission["placementStatus"];
  }) {
    const map: Record<string, string> = {
      SUBMITTED: "bg-blue-100 text-blue-700",
      INTERVIEWING: "bg-yellow-100 text-yellow-700",
      PLACED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${map[status] ?? ""}`}
      >
        {status}
      </span>
    );
  }

  function InvoiceBadge({
    status,
  }: {
    status: VendorSubmission["invoiceStatus"];
  }) {
    const map: Record<string, string> = {
      NOT_INVOICED: "bg-muted text-muted-foreground",
      INVOICED: "bg-orange-100 text-orange-700",
      PAID: "bg-green-100 text-green-700",
    };
    const label: Record<string, string> = {
      NOT_INVOICED: "Not Invoiced",
      INVOICED: "Invoiced",
      PAID: "Paid",
    };
    return (
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${map[status] ?? ""}`}
      >
        {label[status]}
      </span>
    );
  }

  const updateSubmission = useUpdateVendorSubmission(
    vendor.id,
    updatingId ?? 0,
  );

  const handleMarkPaid = useCallback(
    (sub: VendorSubmission) => {
      setUpdatingId(sub.id);
      updateSubmission.mutate(
        {
          invoiceStatus: "PAID",
          paidAt: new Date().toISOString().split("T")[0],
        },
        {
          onSuccess: () => {
            toast.success("Marked as paid");
            setUpdatingId(null);
          },
          onError: (e) => {
            toast.error(getErrorMessage(e));
            setUpdatingId(null);
          },
        },
      );
    },
    [updateSubmission],
  );

  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{vendor.name} — Submissions</SheetTitle>
          <SheetDescription>
            Candidates submitted by this vendor and invoice status
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-3 overflow-y-auto flex-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))
          ) : submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No submissions yet
            </p>
          ) : (
            submissions.map((sub) => {
              const candidateName =
                [sub.candidateFirstName, sub.candidateLastName]
                  .filter(Boolean)
                  .join(" ") ||
                sub.candidateEmail ||
                `Candidate #${sub.candidateId}`;
              return (
                <div key={sub.id} className="border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{candidateName}</p>
                      {sub.jobTitle && (
                        <p className="text-xs text-muted-foreground">
                          {sub.jobTitle}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={sub.placementStatus} />
                      <InvoiceBadge status={sub.invoiceStatus} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Submitted{" "}
                      {format(new Date(sub.submittedAt), "MMM d, yyyy")}
                    </span>
                    {sub.invoiceAmount && (
                      <span className="font-medium">
                        ${parseFloat(sub.invoiceAmount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {sub.placementStatus === "PLACED" &&
                    sub.invoiceStatus !== "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        disabled={updatingId === sub.id}
                        onClick={() => handleMarkPaid(sub)}
                      >
                        Mark Invoice Paid
                      </Button>
                    )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface VendorCardProps {
  vendor: RecruitmentVendor;
  isHr: boolean;
  onEdit: (v: RecruitmentVendor) => void;
  onViewSubmissions: (v: RecruitmentVendor) => void;
  onDelete: (id: number) => void;
}

function VendorCard({
  vendor,
  isHr,
  onEdit,
  onViewSubmissions,
  onDelete,
}: VendorCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{vendor.name}</p>
            {vendor.contactName && (
              <p className="text-xs text-muted-foreground">
                {vendor.contactName}
              </p>
            )}
          </div>
          <Badge
            variant={vendor.status === "ACTIVE" ? "default" : "secondary"}
            className="text-[10px] shrink-0"
          >
            {vendor.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-md py-1.5">
            <p className="text-sm font-semibold">{vendor.submissionCount}</p>
            <p className="text-[10px] text-muted-foreground">Submissions</p>
          </div>
          <div className="bg-muted/50 rounded-md py-1.5">
            <p className="text-sm font-semibold">{vendor.placements}</p>
            <p className="text-[10px] text-muted-foreground">Placed</p>
          </div>
          <div className="bg-muted/50 rounded-md py-1.5">
            <p className="text-sm font-semibold">
              ${parseFloat(vendor.revenueTotal || "0").toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          {vendor.contactEmail && <p>{vendor.contactEmail}</p>}
          {vendor.feePercent && <p>Fee: {parseFloat(vendor.feePercent)}%</p>}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewSubmissions(vendor)}
          >
            Submissions
          </Button>
          {isHr && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(vendor)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(vendor.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const isHr = HR_ROLES.includes(role);

  const { data: vendors = [], isLoading } = useRecruitmentVendors();
  const deleteVendor = useDeleteVendor();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<RecruitmentVendor | null>(
    null,
  );
  const [viewingVendor, setViewingVendor] = useState<RecruitmentVendor | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAdd = useCallback(() => {
    setEditingVendor(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((v: RecruitmentVendor) => {
    setEditingVendor(v);
    setSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingVendor(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deletingId === null) return;
    deleteVendor.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Vendor deleted");
        setDeletingId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeletingId(null);
      },
    });
  }, [deletingId, deleteVendor]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Vendors"
        subtitle="Recruitment agencies and staffing partners"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Vendors"
      subtitle="Manage recruitment agencies and staffing partners"
      badge={`${vendors.length} vendors`}
      actions={
        isHr ? (
          <Button size="sm" onClick={handleAdd}>
            <svg
              className="mr-1.5 h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Vendor
          </Button>
        ) : undefined
      }
    >
      {vendors.length === 0 ? (
        <EmptyState
          illustration={<EmptyTeamIllustration />}
          title="No vendors yet"
          description="Add a recruitment agency or staffing partner to track submissions and placements."
          action={
            isHr ? { label: "Add Vendor", onClick: handleAdd } : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              isHr={isHr}
              onEdit={handleEdit}
              onViewSubmissions={setViewingVendor}
              onDelete={setDeletingId}
            />
          ))}
        </div>
      )}

      {sheetOpen && (
        <VendorSheet initial={editingVendor} onClose={handleCloseSheet} />
      )}
      {viewingVendor && (
        <SubmissionSheet
          vendor={viewingVendor}
          onClose={() => setViewingVendor(null)}
        />
      )}
      {deletingId !== null && (
        <AlertDialog
          open
          onOpenChange={(v) => {
            if (!v) setDeletingId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the vendor and all submission
                records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteVendor.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteVendor.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageWrapper>
  );
}
