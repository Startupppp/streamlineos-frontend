"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { staggerContainer } from "@/lib/motion-variants";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrAnnouncements,
  useAllHrAnnouncements,
  useDeleteHrAnnouncement,
  useMarkHrAnnouncementRead,
  type HrAnnouncement,
} from "@/hooks/api/hr/announcements";
import { AnnouncementCard } from "@/features/hr/announcements/announcement-card";
import { AnnouncementFormSheet } from "@/features/hr/announcements/announcement-form-sheet";

type ActiveTab = "published" | "all";

function AnnouncementsContent() {
  const canManage = useCan("hr:announcements:manage");

  const {
    data: published,
    isLoading: loadingPublished,
    isError: errorPublished,
    refetch: refetchPublished,
  } = useHrAnnouncements();
  const {
    data: all,
    isLoading: loadingAll,
    isError: errorAll,
    refetch: refetchAll,
  } = useAllHrAnnouncements({ enabled: canManage });

  const remove = useDeleteHrAnnouncement();
  const markRead = useMarkHrAnnouncementRead();

  const [activeTab, setActiveTab] = useState<ActiveTab>("published");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HrAnnouncement | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const displayedList = useMemo(() => {
    if (activeTab === "all" && canManage) return all ?? [];
    return published ?? [];
  }, [activeTab, canManage, all, published]);

  const isLoading = activeTab === "all" ? loadingAll : loadingPublished;
  const isError = activeTab === "all" ? errorAll : errorPublished;

  const handleNewClick = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((a: HrAnnouncement) => {
    setEditTarget(a);
    setSheetOpen(true);
  }, []);

  const handleDelete = useCallback((id: number) => setDeleteId(id), []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleMarkRead = useCallback(
    (id: number) => {
      markRead.mutate(id);
    },
    [markRead],
  );

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setEditTarget(null);
    setSheetOpen(open);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setEditTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteId) return;
    toast.promise(remove.mutateAsync(deleteId), {
      loading: "Deleting announcement...",
      success: () => {
        setDeleteId(null);
        return "Announcement deleted";
      },
      error: getErrorMessage,
    });
  }, [deleteId, remove]);

  const handleTabPublished = useCallback(() => setActiveTab("published"), []);
  const handleTabAll = useCallback(() => setActiveTab("all"), []);

  const handleRetry = useCallback(() => {
    void refetchPublished();
    void refetchAll();
  }, [refetchPublished, refetchAll]);

  return (
    <PageWrapper
      title="Announcements"
      subtitle="Stay updated with company news and updates"
      badge={undefined}
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            size="sm"
            className="gap-1.5"
            onClick={handleNewClick}
          >
            New Announcement
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {canManage && (
          <FilterPillGroup>
            <FilterPill
              active={activeTab === "published"}
              onClick={handleTabPublished}
            >
              Published
            </FilterPill>
            <FilterPill active={activeTab === "all"} onClick={handleTabAll}>
              All
            </FilterPill>
          </FilterPillGroup>
        )}

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg shadow-sm p-5"
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                Failed to load announcements
              </p>
              <p className="text-xs text-muted-foreground">
                Something went wrong. Please try again.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && displayedList.length === 0 && (
          <EmptyState
            illustration={<EmptyMailIllustration className="h-32 w-32" />}
            title="No announcements yet"
            description={
              canManage
                ? "Create your first announcement to keep the team informed."
                : "Check back later for company news and updates."
            }
            action={
              canManage
                ? { label: "New Announcement", onClick: handleNewClick }
                : undefined
            }
          />
        )}

        {!isLoading && !isError && displayedList.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {displayedList.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                canManage={canManage}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkRead={handleMarkRead}
              />
            ))}
          </motion.div>
        )}
      </div>

      <AnnouncementFormSheet
        key={editTarget?.id ?? "new"}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editTarget={editTarget}
        onSuccess={handleFormSuccess}
      />

      <ConfirmSheet
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Announcement"
        description="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        isPending={remove.isPending}
      />
    </PageWrapper>
  );
}

export default function AnnouncementsPage() {
  return <AnnouncementsContent />;
}
