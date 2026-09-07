"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
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
import {
  useArticleMigrationPreview,
  useRunArticleMigration,
} from "@/hooks/api/kb/article-migration";
import { KbDatabaseIcon } from "@/features/wiki/lib/kb-icons";
import { SectionCard, SectionHeader } from "./knowledge-settings-sections";

export function ArticleMigrationSection() {
  const { data: preview, isLoading, isError, error, refetch } =
    useArticleMigrationPreview();
  const runMigration = useRunArticleMigration();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleRetry() {
    void refetch();
  }

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
          ) : isError ? (
            <ErrorState
              compact
              title="Couldn't load migration preview"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : preview ? (
            <StatCardGrid cols={4}>
              <StatCard label="Total articles" value={preview.total} />
              <StatCard label="Already migrated" value={preview.alreadyMigrated} tone="emerald" />
              <StatCard label="Will migrate" value={preview.willMigrate} tone="accent" />
              <StatCard label="Published" value={preview.byStatus["published"] ?? 0} tone="emerald" />
            </StatCardGrid>
          ) : null}

          {preview && preview.sample.length > 0 && (
            <div className="rounded-md border border-border bg-muted/10 px-3 py-2 space-y-1">
              <p className="text-dense font-medium text-muted-foreground uppercase tracking-wide">
                Sample ({Math.min(preview.sample.length, 10)} of{" "}
                {preview.willMigrate})
              </p>
              <ul className="space-y-0.5">
                {preview.sample.slice(0, 10).map((a) => (
                  <li key={a.id} className="text-sm text-foreground">
                    <TruncatedText text={a.title ?? ""} />
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
