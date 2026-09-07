"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { buildAnnouncementSchema, zodFieldErrors } from "@/features/hr/announcements/announcement-schema";
import { getErrorMessage } from "@/lib/get-error-message";
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

interface UseAnnouncementFormArgs {
  editTarget: HrAnnouncement | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function useAnnouncementForm({
  editTarget,
  onOpenChange,
  onSuccess,
}: UseAnnouncementFormArgs) {
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

  return {
    formData,
    fieldErrors,
    departmentOptions,
    branchOptions,
    roleOptions,
    publishParts,
    expiresParts,
    isSubmitting,
    handleOpenChange,
    handleTitleChange,
    handleContentChange,
    handleTargetTypeChange,
    handleTargetIdsChange,
    handleStatusChange,
    handlePinnedChange,
    handlePublishDateChange,
    handlePublishTimeChange,
    handleExpiresDateChange,
    handleExpiresTimeChange,
    handleSave,
  };
}
