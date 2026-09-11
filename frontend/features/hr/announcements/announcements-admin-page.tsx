"use client";

import { useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrAnnouncements,
  useAllHrAnnouncements,
  useDeleteHrAnnouncement,
  useMarkHrAnnouncementRead,
  type HrAnnouncement,
} from "@/hooks/api/hr/announcements";
import { AnnouncementFormSheet } from "@/features/hr/announcements/announcement-form-sheet";
import { AnnouncementsBody } from "@/features/hr/announcements/announcements-body";

type ActiveTab = "published" | "all";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;

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

export function AnnouncementsAdminPage() {
  return <AnnouncementsContent />;
}
