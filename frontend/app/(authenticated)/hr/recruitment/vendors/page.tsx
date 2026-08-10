"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus } from "lucide-react";
import { useRecruitmentVendors, useDeleteVendor, type RecruitmentVendor } from "@/hooks/api";
import { VendorSheet } from "@/features/hr/recruitment/vendors/vendor-sheet";
import { SubmissionSheet } from "@/features/hr/recruitment/vendors/submission-sheet";
import { VendorCard } from "@/features/hr/recruitment/vendors/vendor-card";
import { ErrorState } from "@/components/shared/error-state";

const HR_ROLES = ["FINAL", "HR", "ADMIN", "HR_MANAGER", "OWNER"];

export default function VendorsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const isHr = HR_ROLES.includes(role);

  const { data: vendors = [], isLoading, isError, refetch } = useRecruitmentVendors();
  const deleteVendor = useDeleteVendor();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<RecruitmentVendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<RecruitmentVendor | null>(null);
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

  const handleCloseSubmissions = useCallback(() => setViewingVendor(null), []);
  const handleCloseDelete = useCallback((v: boolean) => { if (!v) setDeletingId(null); }, []);

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
      <PageWrapper title="Vendors" subtitle="Recruitment agencies and staffing partners">
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Vendors" subtitle="Manage recruitment agencies and staffing partners">
        <ErrorState
          title="Unable to load vendors"
          description="Try again. If this keeps happening, check your permissions or contact an admin."
          onRetry={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Vendors"
      subtitle="Manage recruitment agencies and staffing partners"
      actions={
        isHr ? (
          <Button size="sm" onClick={handleAdd} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Vendor
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
      {vendors.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptyTeamIllustration />}
          title="No vendors yet"
          description="Add a recruitment agency or staffing partner to track submissions and placements."
          action={isHr ? { label: "Add Vendor", onClick: handleAdd } : undefined}
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

      {sheetOpen && <VendorSheet initial={editingVendor} onClose={handleCloseSheet} />}
      {viewingVendor && <SubmissionSheet vendor={viewingVendor} onClose={handleCloseSubmissions} />}
      <ConfirmSheet
        open={deletingId !== null}
        onOpenChange={handleCloseDelete}
        title="Delete Vendor"
        description="This will permanently delete the vendor and all submission records. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={deleteVendor.isPending}
        onConfirm={handleDeleteConfirm}
      />
      </div>
    </PageWrapper>
  );
}
