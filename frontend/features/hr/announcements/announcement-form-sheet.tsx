"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { AnnouncementTargetPicker } from "@/features/hr/announcements/announcement-target-picker";
import { buildAnnouncementSchema, zodFieldErrors } from "@/features/hr/announcements/announcement-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useHrDepartments } from "@/hooks/api/hr/employees";
import { useBranches } from "@/hooks/api/branches";
import { useRoles } from "@/hooks/api/roles";
import {
  useCreateHrAnnouncement,
  useUpdateHrAnnouncement,
  type HrAnnouncement,
  type CreateHrAnnouncementData,
} from "@/hooks/api/hr/announcements";

export const EMPTY_FORM: CreateHrAnnouncementData = {
  title: "",
  content: "",
  targetType: "ALL",
  targetIds: [],
  isPinned: false,
  status: "DRAFT",
  attachmentUrls: [],
};

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

export interface AnnouncementFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: HrAnnouncement | null;
  onSuccess: () => void;
}

export function AnnouncementFormSheet({
  open,
  onOpenChange,
  editTarget,
  onSuccess,
}: AnnouncementFormSheetProps) {
  const create = useCreateHrAnnouncement();
  const update = useUpdateHrAnnouncement();

  const [formData, setFormData] = useState<CreateHrAnnouncementData>(() =>
    editTarget
      ? {
          title: editTarget.title,
          content: editTarget.content,
          targetType: editTarget.targetType,
          targetIds: editTarget.targetIds ?? [],
          isPinned: editTarget.isPinned,
          status: editTarget.status === "EXPIRED" ? "PUBLISHED" : editTarget.status,
          publishAt: editTarget.publishAt ?? undefined,
          expiresAt: editTarget.expiresAt ?? undefined,
          attachmentUrls: editTarget.attachmentUrls ?? [],
        }
      : EMPTY_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: departments } = useHrDepartments();
  const { data: branches } = useBranches({
    enabled: formData.targetType === "BRANCH",
  });
  const { data: roles } = useRoles({
    enabled: formData.targetType === "ROLE",
  });

  const departmentOptions = useMemo(
    () => (departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
    [departments],
  );

  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: String(b.id), label: b.name })),
    [branches],
  );

  const roleOptions = useMemo(
    () => (roles ?? []).map((r) => ({ value: String(r.id), label: r.name })),
    [roles],
  );

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setFormData(EMPTY_FORM);
        setFieldErrors({});
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, title: e.target.value }));
      clearFieldError("title");
    },
    [clearFieldError],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, content: e.target.value }));
      clearFieldError("content");
    },
    [clearFieldError],
  );

  const handleTargetTypeChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({
        ...prev,
        targetType: value as HrAnnouncement["targetType"],
        targetIds: [],
      }));
      clearFieldError("targetType");
      clearFieldError("targetIds");
    },
    [clearFieldError],
  );

  const handleTargetIdsChange = useCallback(
    (ids: string[]) => {
      setFormData((prev) => ({ ...prev, targetIds: ids }));
      clearFieldError("targetIds");
    },
    [clearFieldError],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({ ...prev, status: value as HrAnnouncement["status"] }));
      clearFieldError("status");
      clearFieldError("publishAt");
    },
    [clearFieldError],
  );

  const handlePinnedChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPinned: checked }));
  }, []);

  const publishParts = useMemo(() => splitDateTime(formData.publishAt ?? undefined), [formData.publishAt]);
  const expiresParts = useMemo(() => splitDateTime(formData.expiresAt ?? undefined), [formData.expiresAt]);

  const handlePublishDateChange = useCallback(
    (date: string) => {
      setFormData((prev) => {
        const { time } = splitDateTime(prev.publishAt ?? undefined);
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
        const { date } = splitDateTime(prev.publishAt ?? undefined);
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
        const { time } = splitDateTime(prev.expiresAt ?? undefined);
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
        const { date } = splitDateTime(prev.expiresAt ?? undefined);
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
            onOpenChange(false);
            onSuccess();
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
            onOpenChange(false);
            onSuccess();
            return "Announcement created";
          },
          error: getErrorMessage,
        },
      );
    }
  }, [formData, editTarget, create, update, onOpenChange, onSuccess]);

  const isSubmitting = create.isPending || update.isPending;

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
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
            <p className="text-dense text-muted-foreground mt-0.5">
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
  );
}
