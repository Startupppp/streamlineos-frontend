"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  useProjectRetentionSettings,
  useUpdateRetentionPolicy,
  useSetLegalHold,
} from "@/hooks/api/build/project-retention-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PmPageShell, PmPanel, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import {
  RETENTION_DAYS_OPTIONS,
  RETENTION_SECTION_VALUES,
  parseRetentionSection,
  type RetentionSection,
  type RetentionDaysOptionValue,
  type ProjectRetentionSettings,
} from "@/features/build/settings/project-settings-retention-schema";

const SECTION_PARAM = "section";

interface ProjectSettingsRetentionPageProps {
  projectId: number;
}

const SKELETON_LOADING = (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

function retentionDaysLabel(days: number | null): string {
  if (days === null) return "Forever (no automatic deletion)";
  const found = RETENTION_DAYS_OPTIONS.find((o) => o.value === days);
  return found ? found.label : `${days} days`;
}

function RetentionSelectValue(days: number | null): string {
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
        value={RetentionSelectValue(value)}
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
  settings: ProjectRetentionSettings;
  projectId: number;
  canEdit: boolean;
}

function PolicySection({ settings, projectId, canEdit }: PolicySectionProps) {
  const updatePolicy = useUpdateRetentionPolicy(projectId);
  const [inheritOrgPolicy, setInheritOrgPolicy] = useState(settings.inheritOrgPolicy);
  const [closedTicketDays, setClosedTicketDays] = useState<RetentionDaysOptionValue | null>(
    settings.closedTicketRetentionDays,
  );
  const [attachmentDays, setAttachmentDays] = useState<RetentionDaysOptionValue | null>(
    settings.attachmentRetentionDays,
  );
  const [auditLogDays, setAuditLogDays] = useState<RetentionDaysOptionValue | null>(
    settings.auditLogRetentionDays,
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
            <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>Retention policy</h3>
            <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
              Configure how long this project&apos;s work artifacts are retained before
              automatic deletion. Null retention means records are kept indefinitely.
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

interface HoldsSectionProps {
  settings: ProjectRetentionSettings;
  projectId: number;
  canEdit: boolean;
}

function HoldsSection({ settings, projectId, canEdit }: HoldsSectionProps) {
  const setLegalHold = useSetLegalHold(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [pendingActive, setPendingActive] = useState<boolean>(false);

  const handleHoldReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHoldReason(e.target.value);
    },
    [],
  );

  const handleRequestSetHold = useCallback(() => {
    setPendingActive(true);
    setConfirmOpen(true);
  }, []);

  const handleRequestRemoveHold = useCallback(() => {
    setPendingActive(false);
    setConfirmOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setLegalHold.mutate(
      {
        active: pendingActive,
        reason: pendingActive && holdReason.length > 0 ? holdReason : undefined,
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.success(pendingActive ? "Legal hold applied" : "Legal hold removed");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [setLegalHold, pendingActive, holdReason]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    if (!setLegalHold.isPending) setConfirmOpen(open);
  }, [setLegalHold.isPending]);

  return (
    <div className="flex flex-col gap-4">
      <PmSection index={0}>
        <PmPanel className="p-4" solid>
          <div className="mb-3 border-b border-border pb-3">
            <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>Legal hold</h3>
            <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
              A legal hold suspends all automatic retention deletion for this project. Use
              it when a project&apos;s data may be subject to litigation or regulatory review.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                settings.legalHold ? "bg-amber-500" : "bg-green-500",
              )}
              aria-hidden
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">
                {settings.legalHold ? "Legal hold is active" : "No legal hold"}
              </span>
              {settings.legalHold && settings.legalHoldReason ? (
                <p className={cn("text-xs text-muted-foreground", TEXT_BODY)}>
                  Reason: {settings.legalHoldReason}
                </p>
              ) : null}
              {settings.legalHold && settings.legalHoldSetAt ? (
                <p className="text-xs text-muted-foreground">
                  Applied:{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(settings.legalHoldSetAt))}
                </p>
              ) : null}
              {settings.legalHold ? (
                <p className="text-xs text-muted-foreground">
                  Current retention period:{" "}
                  <span className="font-medium">
                    {retentionDaysLabel(settings.closedTicketRetentionDays)} (suspended)
                  </span>
                </p>
              ) : null}
            </div>
          </div>
          {canEdit ? (
            <div className="mt-4 flex justify-end">
              {settings.legalHold ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRequestRemoveHold}
                >
                  Remove legal hold
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRequestSetHold}
                >
                  <ShieldAlert className="mr-1.5 h-4 w-4" aria-hidden />
                  Apply legal hold
                </Button>
              )}
            </div>
          ) : null}
        </PmPanel>
      </PmSection>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        title={pendingActive ? "Apply legal hold?" : "Remove legal hold?"}
        description={
          pendingActive
            ? "All automatic retention deletion will be suspended until the hold is removed. This cannot be undone without explicit action."
            : "Retention deletion will resume according to the configured policy. Records retained beyond the hold period will be eligible for deletion."
        }
        confirmLabel={pendingActive ? "Apply hold" : "Remove hold"}
        destructive={pendingActive}
        isPending={setLegalHold.isPending}
        onConfirm={handleConfirm}
        content={
          pendingActive ? (
            <div className="px-1 pb-2">
              <label htmlFor="hold-reason" className="text-sm font-medium">
                Reason (optional)
              </label>
              <Textarea
                id="hold-reason"
                className="mt-1.5"
                placeholder="Litigation reference, regulatory requirement…"
                value={holdReason}
                onChange={handleHoldReasonChange}
                rows={3}
              />
            </div>
          ) : undefined
        }
        keepOpenOnConfirm
      />
    </div>
  );
}

const NAV_SECTIONS: { id: RetentionSection; label: string }[] = [
  { id: "policy", label: "Policy" },
  { id: "holds", label: "Legal Holds" },
];

export function ProjectSettingsRetentionPage({ projectId }: ProjectSettingsRetentionPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canEdit = useCan("build:update");
  const listFilters = useBuildListFilters({ withSearch: true });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeSection = parseRetentionSection(searchParams.get(SECTION_PARAM));

  const handleSectionChange = useCallback(
    (section: RetentionSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(SECTION_PARAM, section);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleKeyboardClear = useCallback(() => {
    listFilters.clearAll();
  }, [listFilters]);

  const handleKeyboardOpen = useCallback((_index: number) => {}, []);

  useBuildListKeyboard({
    itemCount: 0,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef,
  });

  const {
    data: settings,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectRetentionSettings(projectId);

  const pageState = usePageState({
    permission: "build:update",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && settings === undefined,
  });

  const handleRefetch = useCallback(() => void refetch(), [refetch]);

  const emptyState = (
    <EmptyState
      className={PM_FILL_PANEL}
      illustrationPreset="projects"
      title="Retention policy not configured"
      description="No retention policy is currently active for this project. Save a policy to begin managing data retention."
    />
  );

  return (
    <PageWrapper
      title="Retention"
      subtitle="Manage data retention periods and legal holds for this project"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search retention settings…",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.activeCount > 0 ? listFilters.clearAll : undefined}
        />
      }
    >
      <PmPageShell>
        <div className="mb-4 flex gap-1 border-b border-border pb-4">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={activeSection === s.id}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeSection === s.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              )}
              onClick={() => handleSectionChange(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <PageState
          resolution={pageState}
          loading={SKELETON_LOADING}
          empty={emptyState}
          onRetry={handleRefetch}
          className="flex-1"
        >
          {settings !== undefined ? (
            activeSection === "policy" ? (
              <PolicySection
                settings={settings}
                projectId={projectId}
                canEdit={canEdit}
              />
            ) : (
              <HoldsSection
                settings={settings}
                projectId={projectId}
                canEdit={canEdit}
              />
            )
          ) : null}
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
