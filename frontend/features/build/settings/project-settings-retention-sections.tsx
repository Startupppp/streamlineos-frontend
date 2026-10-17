"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useUpdateRetentionPolicy } from "@/hooks/api/build/project-retention-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import type { ProjectsRetentionSettingsGetSettingsResponse } from "@/contracts/build-contracts.generated";
import {
  RETENTION_DAYS_OPTIONS,
  type RetentionDaysOptionValue,
} from "@/features/build/settings/project-settings-retention-schema";

export function retentionDaysLabel(days: number | null): string {
  if (days === null) return "Forever (no automatic deletion)";
  const found = RETENTION_DAYS_OPTIONS.find((o) => o.value === days);
  return found ? found.label : `${days} days`;
}

function retentionSelectValue(days: number | null): string {
  if (days === null) return "forever";
  return String(days);
}

function parseRetentionSelectValue(v: string): RetentionDaysOptionValue | null {
  if (v === "forever") return null;
  const parsed = parseInt(v, 10);
  const found = RETENTION_DAYS_OPTIONS.find((o) => o.value === parsed);
  return found ? found.value : null;
}

interface RetentionFieldRowProps {
  label: string;
  description: string;
  value: RetentionDaysOptionValue | null;
  onChange: (value: RetentionDaysOptionValue | null) => void;
  disabled: boolean;
}

function RetentionFieldRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: RetentionFieldRowProps) {
  const handleChange = useCallback(
    (raw: string) => {
      onChange(parseRetentionSelectValue(raw));
    },
    [onChange],
  );

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-sm font-medium", TEXT_ONE_LINE)}>{label}</span>
        <span className={cn("text-xs text-muted-foreground", TEXT_BODY)}>{description}</span>
      </div>
      <Select
        value={retentionSelectValue(value)}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-48 shrink-0" aria-label={`${label} retention period`}>
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {RETENTION_DAYS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
          <SelectItem value="forever">Forever (no automatic deletion)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface PolicySectionProps {
  settings: ProjectsRetentionSettingsGetSettingsResponse;
  projectId: number;
  canEdit: boolean;
}

export function PolicySection({ settings, projectId, canEdit }: PolicySectionProps) {
  const updatePolicy = useUpdateRetentionPolicy(projectId);
  const [inheritOrgPolicy, setInheritOrgPolicy] = useState(settings.inheritOrgPolicy);
  const [closedTicketDays, setClosedTicketDays] = useState<RetentionDaysOptionValue | null>(
    RETENTION_DAYS_OPTIONS.find((o) => o.value === settings.closedTicketRetentionDays)?.value ?? null,
  );
  const [attachmentDays, setAttachmentDays] = useState<RetentionDaysOptionValue | null>(
    RETENTION_DAYS_OPTIONS.find((o) => o.value === settings.attachmentRetentionDays)?.value ?? null,
  );
  const [auditLogDays, setAuditLogDays] = useState<RetentionDaysOptionValue | null>(
    RETENTION_DAYS_OPTIONS.find((o) => o.value === settings.auditLogRetentionDays)?.value ?? null,
  );

  const handleInheritToggle = useCallback((checked: boolean) => {
    setInheritOrgPolicy(checked);
  }, []);

  const handleSave = useCallback(() => {
    updatePolicy.mutate(
      {
        inheritOrgPolicy,
        closedTicketRetentionDays: inheritOrgPolicy ? null : closedTicketDays,
        attachmentRetentionDays: inheritOrgPolicy ? null : attachmentDays,
        auditLogRetentionDays: inheritOrgPolicy ? null : auditLogDays,
      },
      {
        onSuccess: () => toast.success("Retention policy saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [updatePolicy, inheritOrgPolicy, closedTicketDays, attachmentDays, auditLogDays]);

  const readOnly = !canEdit;

  return (
    <div className="flex flex-col gap-4">
      <PmSection index={0}>
        <PmPanel className="p-4" solid>
          <div className="mb-3 border-b border-border pb-3">
            <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Retention policy</h3>
            <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
              Record how long this project&apos;s work artifacts should be retained. These values
              are stored as policy — no automated job deletes on their basis yet, so nothing is
              removed today. Null retention means records are kept indefinitely.
            </p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Inherit org-level policy</span>
              <span className="text-xs text-muted-foreground">
                Use the retention periods configured at the organisation level
              </span>
            </div>
            <Switch
              checked={inheritOrgPolicy}
              onCheckedChange={handleInheritToggle}
              disabled={readOnly}
              aria-label="Inherit org-level retention policy"
            />
          </div>
          {!inheritOrgPolicy ? (
            <div className="mt-2">
              <RetentionFieldRow
                label="Closed tickets"
                description="How long to keep closed and archived work items"
                value={closedTicketDays}
                onChange={setClosedTicketDays}
                disabled={readOnly}
              />
              <RetentionFieldRow
                label="Attachments"
                description="How long to keep file attachments on work items"
                value={attachmentDays}
                onChange={setAttachmentDays}
                disabled={readOnly}
              />
              <RetentionFieldRow
                label="Audit log"
                description="How long to retain the project change and access audit log"
                value={auditLogDays}
                onChange={setAuditLogDays}
                disabled={readOnly}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Custom periods are inherited from the organisation. To configure a project-specific
              policy, disable inheritance above.
            </p>
          )}
        </PmPanel>
      </PmSection>
      {canEdit ? (
        <div className="flex justify-end">
          <LoadingButton
            type="button"
            size="sm"
            isPending={updatePolicy.isPending}
            onClick={handleSave}
          >
            Save policy
          </LoadingButton>
        </div>
      ) : null}
    </div>
  );
}
