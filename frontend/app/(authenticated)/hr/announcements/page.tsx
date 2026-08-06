"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  PAGE_BODY_EMPTY_CLASS,
  PAGE_BODY_SKELETON_CLASS,
} from "@/components/ui/content-fill-panel";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { staggerContainer } from "@/lib/motion-variants";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
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

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;

function AnnouncementsBody({
  isLoading,
  isError,
  list,
  canManage,
  onRetry,
  onNew,
  onEdit,
  onDelete,
  onMarkRead,
}: {
  isLoading: boolean;
  isError: boolean;
  list: HrAnnouncement[];
  canManage: boolean;
  onRetry: () => void;
  onNew: () => void;
  onEdit: (a: HrAnnouncement) => void;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}) {
  if (isLoading) {
    return (
      <div className={PAGE_BODY_SKELETON_CLASS}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className={PAGE_BODY_EMPTY_CLASS}
        title="Failed to load announcements"
        description="Something went wrong. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (list.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyMailIllustration className="h-full w-full" />}
        title="No announcements yet"
        description={
          canManage
            ? "Create your first announcement to keep the team informed."
            : "Check back later for company news and updates."
        }
        action={
          canManage ? { label: "New Announcement", onClick: onNew } : undefined
        }
        className={PAGE_BODY_EMPTY_CLASS}
      />
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="min-h-0 flex-1 space-y-3 overflow-y-auto"
    >
      {list.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onMarkRead={onMarkRead}
        />
      ))}
    </motion.div>
  );
}

function AnnouncementsContent() {
  const hrModuleEnabled = useModuleEnabled("hr");
  const canManage = useCan("hr:announcements:manage") && hrModuleEnabled;

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

  const handleTabChange = useCallback((value: string) => {
    if (value === "published" || value === "all") setActiveTab(value);
  }, []);

  const handleRetry = useCallback(() => {
    void refetchPublished();
    void refetchAll();
  }, [refetchPublished, refetchAll]);

  const body = (
    <AnnouncementsBody
      isLoading={isLoading}
      isError={isError}
      list={displayedList}
      canManage={canManage}
      onRetry={handleRetry}
      onNew={handleNewClick}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onMarkRead={handleMarkRead}
    />
  );

  if (!canManage) {
    return (
      <PageWrapper
        title="Announcements"
        subtitle="Stay updated with company news and updates"
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">{body}</div>
      </PageWrapper>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <PageWrapper
        title="Announcements"
        subtitle="Stay updated with company news and updates"
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
        filters={
          <TabsList className="w-full shrink-0 md:w-auto">
            <TabsTrigger value="published" className="gap-1.5 truncate">
              Published
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5 truncate">
              All
            </TabsTrigger>
          </TabsList>
        }
        actions={
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            size="sm"
            className="gap-1.5"
            onClick={handleNewClick}
          >
            New Announcement
          </AnimatedIconButton>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsContent value="published" className={TAB_PANEL_CLASS}>
            {body}
          </TabsContent>
          <TabsContent value="all" className={TAB_PANEL_CLASS}>
            {body}
          </TabsContent>
        </div>
      </PageWrapper>

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
    </Tabs>
  );
}

export default function AnnouncementsPage() {
  return <AnnouncementsContent />;
}
