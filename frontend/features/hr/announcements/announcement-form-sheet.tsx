"use client";

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
import { HrSheet } from "@/components/shared/hr-sheet";
import { AnnouncementTargetPicker } from "@/features/hr/announcements/announcement-target-picker";
import { cn } from "@/lib/utils";
import type { HrAnnouncement } from "@/hooks/api/hr/announcements";
import { useAnnouncementForm } from "./use-announcement-form";

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
  const {
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
  } = useAnnouncementForm({ editTarget, onOpenChange, onSuccess });

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
