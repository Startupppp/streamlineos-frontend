"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import {
  Pin,
  Pencil,
  ChevronDown,
  ChevronUp,
  Globe,
  Users,
  Building2,
  Tag,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrAnnouncements,
  useAllHrAnnouncements,
  useCreateHrAnnouncement,
  useUpdateHrAnnouncement,
  useDeleteHrAnnouncement,
  useMarkHrAnnouncementRead,
  type HrAnnouncement,
  type CreateHrAnnouncementData,
} from "@/hooks/api/hr/announcements";
import { DatePicker } from "@/components/ui/date-picker";
import {
  buildAnnouncementSchema,
  zodFieldErrors,
} from "@/features/hr/announcements/announcement-schema";
import { AnnouncementTargetPicker } from "@/features/hr/announcements/announcement-target-picker";
import { useHrDepartments } from "@/hooks/api/hr/employees";
import { useBranches } from "@/hooks/api/branches";
import { useRoles } from "@/hooks/api/roles";
import { cn } from "@/lib/utils";

type ActiveTab = "published" | "all";

function splitDateTime(value?: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    const hh = String(parsed.getHours()).padStart(2, "0");
    const mm = String(parsed.getMinutes()).padStart(2, "0");
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  }
  const [date = "", timePart = ""] = value.split("T");
  return { date, time: timePart.slice(0, 5) };
}

function joinDateTime(date: string, time: string): string | undefined {
  if (!date) return undefined;
  return `${date}T${time || "00:00"}`;
}

const TARGET_TYPE_ICONS: Record<HrAnnouncement["targetType"], React.ReactNode> = {
  ALL: <Globe className="h-3 w-3" />,
  DEPARTMENT: <Users className="h-3 w-3" />,
  BRANCH: <Building2 className="h-3 w-3" />,
  ROLE: <Tag className="h-3 w-3" />,
};

const TARGET_TYPE_LABELS: Record<HrAnnouncement["targetType"], string> = {
  ALL: "Everyone",
  DEPARTMENT: "Department",
  BRANCH: "Branch",
  ROLE: "Role",
};

const STATUS_COLORS: Record<HrAnnouncement["status"], string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  EXPIRED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
};

function getInitials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface AnnouncementCardProps {
  announcement: HrAnnouncement;
  canManage: boolean;
  onEdit: (a: HrAnnouncement) => void;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}

function AnnouncementCard({
  announcement,
  canManage,
  onEdit,
  onDelete,
  onMarkRead,
}: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    if (!expanded) onMarkRead(announcement.id);
    setExpanded((prev) => !prev);
  }, [expanded, announcement.id, onMarkRead]);

  const handleEdit = useCallback(() => onEdit(announcement), [announcement, onEdit]);
  const handleDelete = useCallback(() => onDelete(announcement.id), [announcement.id, onDelete]);

  return (
    <motion.div
      variants={fadeUp}
      className={`bg-card border border-border rounded-lg shadow-sm p-5 transition-shadow duration-200 hover:shadow-md ${
        announcement.isPinned ? "border-l-4 border-l-amber-400" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground text-xs font-bold shrink-0">
          {getInitials(announcement.authorId)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {announcement.isPinned && (
                <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <TruncatedText text={announcement.title} className="text-sm font-semibold text-foreground leading-tight" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {canManage && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {announcement.readCount} reads
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[announcement.status]}`}
              >
                {announcement.status}
              </span>
              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 text-muted-foreground hover:text-foreground"
                    onClick={handleEdit}
                    aria-label="Edit announcement"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    iconSize={14}
                    variant="ghost"
                    size="icon"
                    className="w-7 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    aria-label="Delete announcement"
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground">{formatDate(announcement.createdAt)}</span>
            <Badge
              variant="outline"
              className="h-5 gap-1 text-[10px] px-1.5 font-normal text-muted-foreground"
            >
              {TARGET_TYPE_ICONS[announcement.targetType]}
              {TARGET_TYPE_LABELS[announcement.targetType]}
            </Badge>
          </div>

          <div className="mt-3">
            <p
              className={`text-sm text-muted-foreground leading-relaxed ${
                expanded ? "" : "line-clamp-2"
              }`}
            >
              {announcement.content}
            </p>
            <Button
              type="button"
              variant="link"
              onClick={handleToggleExpand}
              className="mt-1.5 h-auto p-0 gap-1 text-[11px] font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Read more
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const EMPTY_FORM: CreateHrAnnouncementData = {
  title: "",
  content: "",
  targetType: "ALL",
  targetIds: [],
  isPinned: false,
  status: "DRAFT",
  attachmentUrls: [],
};

function AnnouncementsContent() {
  const canManage = useCan("hr:announcements:manage");

  const { data: published, isLoading: loadingPublished, isError: errorPublished, refetch: refetchPublished } = useHrAnnouncements();
  const { data: all, isLoading: loadingAll, isError: errorAll, refetch: refetchAll } = useAllHrAnnouncements({ enabled: canManage });

  const create = useCreateHrAnnouncement();
  const update = useUpdateHrAnnouncement();
  const remove = useDeleteHrAnnouncement();
  const markRead = useMarkHrAnnouncementRead();

  const [activeTab, setActiveTab] = useState<ActiveTab>("published");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HrAnnouncement | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateHrAnnouncementData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: departments } = useHrDepartments();
  const { data: branches } = useBranches({
    enabled: formData.targetType === "BRANCH",
  });
  const { data: roles } = useRoles({
    enabled: formData.targetType === "ROLE",
  });

  const departmentOptions = useMemo(
    () =>
      (departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [departments],
  );

  const branchOptions = useMemo(
    () =>
      (branches ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branches],
  );

  const roleOptions = useMemo(
    () =>
      (roles ?? []).map((r) => ({
        value: String(r.id),
        label: r.name,
      })),
    [roles],
  );

  const displayedList = useMemo(() => {
    if (activeTab === "all" && canManage) return all ?? [];
    return published ?? [];
  }, [activeTab, canManage, all, published]);

  const isLoading = activeTab === "all" ? loadingAll : loadingPublished;
  const isError = activeTab === "all" ? errorAll : errorPublished;

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditTarget(null);
    setFieldErrors({});
  }, []);

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetForm();
      setSheetOpen(open);
    },
    [resetForm],
  );

  const handleNewClick = useCallback(() => {
    resetForm();
    setSheetOpen(true);
  }, [resetForm]);

  const handleEdit = useCallback((a: HrAnnouncement) => {
    setEditTarget(a);
    setFormData({
      title: a.title,
      content: a.content,
      targetType: a.targetType,
      targetIds: a.targetIds ?? [],
      isPinned: a.isPinned,
      status: a.status === "EXPIRED" ? "PUBLISHED" : a.status,
      publishAt: a.publishAt ?? undefined,
      expiresAt: a.expiresAt ?? undefined,
      attachmentUrls: a.attachmentUrls ?? [],
    });
    setFieldErrors({});
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

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, title: e.target.value }));
    clearFieldError("title");
  }, [clearFieldError]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, content: e.target.value }));
    clearFieldError("content");
  }, [clearFieldError]);

  const handleTargetTypeChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      targetType: value as HrAnnouncement["targetType"],
      targetIds: [],
    }));
    clearFieldError("targetType");
    clearFieldError("targetIds");
  }, [clearFieldError]);

  const handleTargetIdsChange = useCallback((ids: string[]) => {
    setFormData((prev) => ({ ...prev, targetIds: ids }));
    clearFieldError("targetIds");
  }, [clearFieldError]);

  const handleStatusChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, status: value as HrAnnouncement["status"] }));
    clearFieldError("status");
    clearFieldError("publishAt");
  }, [clearFieldError]);

  const handlePinnedChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPinned: checked }));
  }, []);

  const publishParts = useMemo(() => splitDateTime(formData.publishAt), [formData.publishAt]);
  const expiresParts = useMemo(() => splitDateTime(formData.expiresAt), [formData.expiresAt]);

  const handlePublishDateChange = useCallback(
    (date: string) => {
      setFormData((prev) => {
        const { time } = splitDateTime(prev.publishAt);
        return { ...prev, publishAt: joinDateTime(date, time || "09:00") };
      });
      clearFieldError("publishAt");
      clearFieldError("expiresAt");
    },
    [clearFieldError],
  );

  const handlePublishTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = e.target.value;
      setFormData((prev) => {
        const { date } = splitDateTime(prev.publishAt);
        if (!date && !time) return { ...prev, publishAt: undefined };
        if (!date) return prev;
        return { ...prev, publishAt: joinDateTime(date, time || "00:00") };
      });
      clearFieldError("publishAt");
      clearFieldError("expiresAt");
    },
    [clearFieldError],
  );

  const handleExpiresDateChange = useCallback(
    (date: string) => {
      setFormData((prev) => {
        const { time } = splitDateTime(prev.expiresAt);
        return { ...prev, expiresAt: joinDateTime(date, time || "17:00") };
      });
      clearFieldError("expiresAt");
    },
    [clearFieldError],
  );

  const handleExpiresTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = e.target.value;
      setFormData((prev) => {
        const { date } = splitDateTime(prev.expiresAt);
        if (!date && !time) return { ...prev, expiresAt: undefined };
        if (!date) return prev;
        return { ...prev, expiresAt: joinDateTime(date, time || "00:00") };
      });
      clearFieldError("expiresAt");
    },
    [clearFieldError],
  );

  const handleSave = useCallback(() => {
    const schema = buildAnnouncementSchema({ isEdit: Boolean(editTarget) });
    const parsed = schema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setFieldErrors({});
    const payload = parsed.data as CreateHrAnnouncementData;

    if (editTarget) {
      toast.promise(
        update.mutateAsync({ id: editTarget.id, ...payload }),
        {
          loading: "Updating announcement...",
          success: () => {
            setSheetOpen(false);
            resetForm();
            return "Announcement updated";
          },
          error: getErrorMessage,
        },
      );
    } else {
      toast.promise(
        create.mutateAsync(payload),
        {
          loading: "Creating announcement...",
          success: () => {
            setSheetOpen(false);
            resetForm();
            return "Announcement created";
          },
          error: getErrorMessage,
        },
      );
    }
  }, [formData, editTarget, create, update, resetForm]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteId) return;
    toast.promise(
      remove.mutateAsync(deleteId),
      {
        loading: "Deleting announcement...",
        success: () => {
          setDeleteId(null);
          return "Announcement deleted";
        },
        error: getErrorMessage,
      },
    );
  }, [deleteId, remove]);

  const handleTabPublished = useCallback(() => setActiveTab("published"), []);
  const handleTabAll = useCallback(() => setActiveTab("all"), []);

  const handleRetry = useCallback(() => {
    void refetchPublished();
    void refetchAll();
  }, [refetchPublished, refetchAll]);

  const isSubmitting = create.isPending || update.isPending;

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
            <FilterPill active={activeTab === "published"} onClick={handleTabPublished}>
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
              <p className="text-sm font-medium text-foreground">Failed to load announcements</p>
              <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
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

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTarget ? "Edit Announcement" : "New Announcement"}
        description={
          editTarget
            ? "Update the details of this announcement."
            : "Create a new announcement for your team."
        }
        onSubmit={handleSave}
        submitLabel={editTarget ? "Save Changes" : "Create Announcement"}
        isPending={isSubmitting}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title" className="text-xs font-medium">
              Title
            </Label>
            <Input
              id="ann-title"
              placeholder="Announcement title"
              value={formData.title}
              onChange={handleTitleChange}
              aria-invalid={Boolean(fieldErrors.title)}
              className={cn("text-sm", fieldErrors.title && "border-destructive")}
            />
            {fieldErrors.title && (
              <p className="text-xs text-destructive">{fieldErrors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-content" className="text-xs font-medium">
              Content
            </Label>
            <Textarea
              id="ann-content"
              placeholder="Write your announcement here..."
              value={formData.content}
              onChange={handleContentChange}
              aria-invalid={Boolean(fieldErrors.content)}
              className={cn(
                "min-h-[120px] text-sm resize-none",
                fieldErrors.content && "border-destructive",
              )}
            />
            {fieldErrors.content && (
              <p className="text-xs text-destructive">{fieldErrors.content}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target Audience</Label>
            <Select value={formData.targetType} onValueChange={handleTargetTypeChange}>
              <SelectTrigger
                className={cn("text-sm", fieldErrors.targetType && "border-destructive")}
                aria-invalid={Boolean(fieldErrors.targetType)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everyone</SelectItem>
                <SelectItem value="DEPARTMENT">Department</SelectItem>
                <SelectItem value="BRANCH">Branch</SelectItem>
                <SelectItem value="ROLE">Role</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.targetType && (
              <p className="text-xs text-destructive">{fieldErrors.targetType}</p>
            )}
          </div>

          {formData.targetType === "DEPARTMENT" && (
            <AnnouncementTargetPicker
              label="Departments"
              placeholder="Select departments"
              searchPlaceholder="Search departments…"
              emptyText="No departments found"
              options={departmentOptions}
              value={formData.targetIds}
              onChange={handleTargetIdsChange}
              error={fieldErrors.targetIds}
            />
          )}

          {formData.targetType === "BRANCH" && (
            <AnnouncementTargetPicker
              label="Branches"
              placeholder="Select branches"
              searchPlaceholder="Search branches…"
              emptyText="No branches found"
              options={branchOptions}
              value={formData.targetIds}
              onChange={handleTargetIdsChange}
              error={fieldErrors.targetIds}
            />
          )}

          {formData.targetType === "ROLE" && (
            <AnnouncementTargetPicker
              label="Roles"
              placeholder="Select roles"
              searchPlaceholder="Search roles…"
              emptyText="No roles found"
              options={roleOptions}
              value={formData.targetIds}
              onChange={handleTargetIdsChange}
              error={fieldErrors.targetIds}
            />
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger
                className={cn("text-sm", fieldErrors.status && "border-destructive")}
                aria-invalid={Boolean(fieldErrors.status)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.status && (
              <p className="text-xs text-destructive">{fieldErrors.status}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Publish At {formData.status === "SCHEDULED" ? "" : "(optional)"}
            </Label>
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-[minmax(0,1fr)_7.5rem]">
              <DatePicker
                id="ann-publish-at"
                value={publishParts.date}
                onChange={handlePublishDateChange}
                placeholder="Pick a date"
                className={cn("text-sm", fieldErrors.publishAt && "border-destructive")}
              />
              <Input
                id="ann-publish-time"
                type="time"
                value={publishParts.time}
                onChange={handlePublishTimeChange}
                disabled={!publishParts.date}
                aria-label="Publish time"
                aria-invalid={Boolean(fieldErrors.publishAt)}
                className={cn("text-sm", fieldErrors.publishAt && "border-destructive")}
              />
            </div>
            {fieldErrors.publishAt && (
              <p className="text-xs text-destructive">{fieldErrors.publishAt}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Expires At (optional)</Label>
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-[minmax(0,1fr)_7.5rem]">
              <DatePicker
                id="ann-expires-at"
                value={expiresParts.date}
                onChange={handleExpiresDateChange}
                placeholder="Pick a date"
                className={cn("text-sm", fieldErrors.expiresAt && "border-destructive")}
              />
              <Input
                id="ann-expires-time"
                type="time"
                value={expiresParts.time}
                onChange={handleExpiresTimeChange}
                disabled={!expiresParts.date}
                aria-label="Expiry time"
                aria-invalid={Boolean(fieldErrors.expiresAt)}
                className={cn("text-sm", fieldErrors.expiresAt && "border-destructive")}
              />
            </div>
            {fieldErrors.expiresAt && (
              <p className="text-xs text-destructive">{fieldErrors.expiresAt}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-foreground">Pin announcement</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Pinned announcements appear at the top
              </p>
            </div>
            <Switch
              id="ann-pinned"
              checked={formData.isPinned}
              onCheckedChange={handlePinnedChange}
            />
          </div>
        </div>
      </HrSheet>

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
