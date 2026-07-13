"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCan } from "@/hooks/api/access";
import {
  useArticleMigrationPreview,
  useRunArticleMigration,
} from "@/hooks/api/kb/article-migration";
import { useKbSettings, useUpdateKbSettings } from "@/hooks/api/kb/settings";
import {
  KbLockIcon,
  KbCheckCircleIcon,
  KbShieldCheckIcon,
  KbUsersIcon,
  KbExternalLinkIcon,
  KbDatabaseIcon,
  KbTrash2Icon,
} from "@/features/knowledge-base/lib/kb-icons";

type ReviewIntervalRow = {
  contentType: string;
  intervalDays: number;
  label: string;
};

const REVIEW_INTERVALS: ReviewIntervalRow[] = [
  { contentType: "Policy", intervalDays: 180, label: "Every 6 months" },
  { contentType: "SOP", intervalDays: 90, label: "Every 3 months" },
  {
    contentType: "Support article",
    intervalDays: 120,
    label: "Every 4 months",
  },
  { contentType: "Other", intervalDays: 365, label: "Yearly" },
];

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-4 py-3 border-b border-border bg-muted/20">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

function ModuleStatusSection() {
  return (
    <SectionCard>
      <SectionHeader
        title="Module status"
        description="The Knowledge module is always active and cannot be disabled."
      />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-500/10 shrink-0">
          <KbCheckCircleIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Knowledge (KB)</p>
          <p className="text-xs text-muted-foreground">
            Core module · Always on
          </p>
        </div>
        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 shrink-0">
          Active
        </span>
      </div>
    </SectionCard>
  );
}

function ReviewIntervalsSection() {
  return (
    <SectionCard>
      <SectionHeader
        title="Default review intervals"
        description="System defaults for content freshness review cycles. Configure per-space overrides within each space's settings."
      />
      <div className="divide-y divide-border/60">
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground w-40 shrink-0">
            Content type
          </span>
          <span className="text-xs font-medium text-muted-foreground flex-1">
            Default interval
          </span>
          <span className="text-xs font-medium text-muted-foreground w-24 text-right">
            Days
          </span>
        </div>
        {REVIEW_INTERVALS.map((row) => (
          <div
            key={row.contentType}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <span className="text-sm text-foreground w-40 shrink-0">
              {row.contentType}
            </span>
            <span className="text-sm text-muted-foreground flex-1">
              {row.label}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground w-24 text-right">
              {row.intervalDays}d
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TrashRetentionSection() {
  const { data: settings, isLoading } = useKbSettings();
  const updateSettings = useUpdateKbSettings();
  const [value, setValue] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const currentValue = settings?.trashRetentionDays ?? 30;

  function handleEdit() {
    setValue(String(currentValue));
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSave() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 365) {
      toast.error("Retention period must be between 1 and 365 days");
      return;
    }
    updateSettings.mutate(
      { trashRetentionDays: parsed },
      {
        onSuccess: () => {
          toast.success("Trash retention updated");
          setEditing(false);
        },
        onError: () => toast.error("Failed to update settings"),
      },
    );
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }

  return (
    <SectionCard>
      <SectionHeader
        title="Trash retention"
        description="Pages in the Recycle Bin are automatically purged after the configured number of days."
      />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
          <KbTrash2Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Auto-purge after</p>
          <p className="text-xs text-muted-foreground">
            Deleted pages older than this threshold are permanently removed by a daily job.
          </p>
        </div>
        {isLoading ? (
          <div className="h-7 w-20 animate-pulse rounded-md bg-muted shrink-0" />
        ) : editing ? (
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              min={1}
              max={365}
              value={value}
              onChange={handleValueChange}
              onKeyDown={handleKeyDown}
              className="h-7 w-20 text-sm text-right"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">days</span>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateSettings.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium tabular-nums text-foreground">
              {currentValue} days
            </span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleEdit}>
              Edit
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function QuickLinksSection() {
  return (
    <SectionCard>
      <SectionHeader
        title="Related settings"
        description="Manage access and module configuration from the platform settings."
      />
      <div className="divide-y divide-border/60">
        <Link
          href="/settings/roles"
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
            <KbUsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Roles &amp; permissions
            </p>
            <p className="text-xs text-muted-foreground">
              Configure who can view, create, manage, and review knowledge
              pages.
            </p>
          </div>
          <KbExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
        </Link>
        <Link
          href="/settings/modules"
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
            <KbShieldCheckIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Modules</p>
            <p className="text-xs text-muted-foreground">
              Manage which product modules are enabled for your organization.
            </p>
          </div>
          <KbExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
        </Link>
      </div>
    </SectionCard>
  );
}

function ArticleMigrationSection() {
  const { data: preview, isLoading } = useArticleMigrationPreview();
  const runMigration = useRunArticleMigration();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDryRun() {
    runMigration.mutate(
      { dryRun: true },
      {
        onSuccess: (data) => {
          toast.info(
            `Dry run: ${data.migrated} article${data.migrated === 1 ? "" : "s"} would be migrated, ${data.skipped} already done.`,
          );
        },
        onError: () => toast.error("Dry run failed"),
      },
    );
  }

  function handleRunConfirmed() {
    setConfirmOpen(false);
    runMigration.mutate(
      { dryRun: false },
      {
        onSuccess: (data) => {
          toast.success(
            `Migration complete — ${data.migrated} migrated, ${data.skipped} skipped.`,
          );
        },
        onError: () => toast.error("Migration failed"),
      },
    );
  }

  return (
    <>
      <SectionCard>
        <SectionHeader
          title="Support KB migration"
          description="Import published Support KB articles as Knowledge pages (one-time, opt-in). Articles are not deleted — the help center keeps working."
        />
        <div className="px-4 py-3 space-y-3">
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          ) : preview ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Total articles", value: preview.total },
                { label: "Already migrated", value: preview.alreadyMigrated },
                { label: "Will migrate", value: preview.willMigrate },
                {
                  label: "Published",
                  value: preview.byStatus["published"] ?? 0,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2"
                >
                  <p className="text-[11px] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {preview && preview.sample.length > 0 && (
            <div className="rounded-md border border-border bg-muted/10 px-3 py-2 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Sample ({Math.min(preview.sample.length, 10)} of{" "}
                {preview.willMigrate})
              </p>
              <ul className="space-y-0.5">
                {preview.sample.slice(0, 10).map((a) => (
                  <li key={a.id} className="text-sm text-foreground truncate">
                    {a.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
              <KbDatabaseIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              Migrated pages land as root-level{" "}
              <span className="font-medium">Support Article</span> pages with{" "}
              <span className="font-medium">org</span> visibility. Public web
              exposure remains with the help center.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDryRun}
              disabled={runMigration.isPending}
            >
              Dry run
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={
                runMigration.isPending || !preview || preview.willMigrate === 0
              }
            >
              Migrate now
            </Button>
          </div>
        </div>
      </SectionCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Migrate Support KB articles?</AlertDialogTitle>
            <AlertDialogDescription>
              {preview?.willMigrate ?? 0} published article
              {(preview?.willMigrate ?? 0) === 1 ? "" : "s"} will be copied into
              Knowledge pages. Support KB articles are not modified or deleted —
              the help center continues working. Already-migrated articles are
              skipped automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunConfirmed}>
              Migrate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function KnowledgeSettingsPage() {
  const canManage = useCan("kb:settings:manage");

  if (!canManage) {
    return (
      <PageWrapper title="Settings">
        <EmptyState
          illustration={
            <KbLockIcon className="h-8 w-8 text-muted-foreground/40" />
          }
          title="Access restricted"
          description="You don't have permission to view knowledge base settings."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Settings"
      subtitle="Knowledge module configuration and defaults"
    >
      <div className="space-y-4 max-w-2xl">
        <ModuleStatusSection />
        <ReviewIntervalsSection />
        <TrashRetentionSection />
        <ArticleMigrationSection />
        <QuickLinksSection />
      </div>
    </PageWrapper>
  );
}
