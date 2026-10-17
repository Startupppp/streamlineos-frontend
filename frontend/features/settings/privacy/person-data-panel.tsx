"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MemberPicker } from "@/components/members/member-picker";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useMemberDirectory, type DirectoryScope } from "@/hooks/api/members/use-member-directory";
import { useCan } from "@/hooks/api/access";
import { useCreatePersonExportJob, useEraseSubject, useExportPersonData } from "@/hooks/api/privacy/gdpr";
import type { GdprErasureResult } from "@/hooks/api/privacy/gdpr-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { ExportJobStatus } from "./export-job-status";
import { TypedEmailConfirmDialog } from "./typed-email-confirm-dialog";
import type { ErasureConfirmValues } from "./erasure-confirm-schema";

const ORG_SCOPE: DirectoryScope = { kind: "org" };

function describeErasure(result: GdprErasureResult): string {
  if (result.blocked) return `Erasure blocked by a legal hold${result.blockReason ? `: ${result.blockReason}` : ""}`;
  const tables = result.tablesAnonymised.length;
  return result.dryRun
    ? `Dry run: ${tables} tables and ${result.storage.manifestSize} files would be anonymised`
    : `Erased: ${tables} tables anonymised, ${result.storage.purged ?? 0} files purged`;
}

/** Export or erase one member's personal data (`hr:retention:manage`, the backend's admin key). */
export function PersonDataPanel() {
  const canManage = useCan("hr:retention:manage");
  const [personId, setPersonId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const selectedIds = useMemo(() => (personId ? [personId] : []), [personId]);
  const { selectedMembers } = useMemberDirectory(ORG_SCOPE, { selectedIds, enabled: canManage });
  const person = selectedMembers[0];

  const exportNow = useExportPersonData();
  const createJob = useCreatePersonExportJob();
  const erase = useEraseSubject();

  function handlePersonChange(userId: string | null) {
    setPersonId(userId);
    setJobId(null);
  }

  function handleExport() {
    if (!personId) return;
    exportNow.mutate(
      { personId },
      {
        onSuccess: () => toast.success("Downloaded the member's data"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleArchive() {
    if (!personId) return;
    createJob.mutate(
      { personId },
      {
        onSuccess: (job) => {
          setJobId(job.id);
          toast.success("Started preparing the data archive");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleDryRun() {
    if (!personId) return;
    erase.mutate(
      { subjectId: personId, reason: "Dry run preview", dryRun: true },
      {
        onSuccess: (result) => toast.info(describeErasure(result)),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleOpenErase() {
    setErasing(true);
  }

  function handleConfirmErase(values: ErasureConfirmValues) {
    if (!personId) return;
    erase.mutate(
      { subjectId: personId, reason: values.reason, dryRun: false },
      {
        onSuccess: (result) => {
          if (result.blocked) toast.error(describeErasure(result));
          else toast.success(describeErasure(result));
          setErasing(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm" aria-labelledby="person-data-heading">
      <div>
        <h2 id="person-data-heading" className="text-sm font-semibold text-foreground">
          Member data
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Export a member&apos;s personal data, or erase it once no legal hold applies. Erasure cannot be undone.
        </p>
      </div>
      <MemberPicker
        scope={ORG_SCOPE}
        value={personId ?? undefined}
        onChange={handlePersonChange}
        placeholder="Choose a member"
        disabled={!canManage}
        className="w-full sm:max-w-sm"
      />
      {person ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-inset p-3 dark:border-background">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{getUserDisplayName(person)}</span>
            <span className="truncate text-xs text-muted-foreground">{person.email}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <LoadingButton type="button" variant="outline" size="sm" isPending={exportNow.isPending} onClick={handleExport}>
              Download data
            </LoadingButton>
            <LoadingButton type="button" variant="outline" size="sm" isPending={createJob.isPending} onClick={handleArchive}>
              Prepare archive
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              isPending={erase.isPending && erase.variables?.dryRun === true}
              onClick={handleDryRun}
            >
              Preview erasure
            </LoadingButton>
            <Button type="button" variant="destructive" size="sm" onClick={handleOpenErase}>
              Erase data…
            </Button>
          </div>
          {jobId ? <ExportJobStatus jobId={jobId} /> : null}
        </div>
      ) : null}
      {person ? (
        <TypedEmailConfirmDialog
          open={erasing}
          onOpenChange={setErasing}
          title={`Erase ${getUserDisplayName(person)}'s personal data?`}
          description="Their personal data is anonymised across this organisation and their stored files are purged. This cannot be undone."
          email={person.email}
          confirmLabel="Erase permanently"
          isPending={erase.isPending && erase.variables?.dryRun === false}
          withReason
          onConfirm={handleConfirmErase}
        />
      ) : null}
    </section>
  );
}
