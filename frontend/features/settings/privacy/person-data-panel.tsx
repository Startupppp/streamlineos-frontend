"use client";

import { useMemo, useState } from "react";
import { Download, FileArchive, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MemberPicker } from "@/components/members/member-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  ScrollArea,
  SCROLL_AREA_PAGE_BODY_CLASS,
} from "@/components/ui/scroll-area";
import { useMemberDirectory, type DirectoryScope } from "@/hooks/api/members/use-member-directory";
import { useCan } from "@/hooks/api/access";
import { useCreatePersonExportJob, useEraseSubject, useExportPersonData } from "@/hooks/api/privacy/gdpr";
import type { GdprErasureResult } from "@/hooks/api/privacy/gdpr-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { cn, resolveImageUrl } from "@/lib/utils";
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

  const displayName = person ? getUserDisplayName(person) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-1.5 pb-4">
        <label htmlFor="privacy-member-picker" className="text-sm font-medium text-foreground">
          Member
        </label>
        <MemberPicker
          id="privacy-member-picker"
          scope={ORG_SCOPE}
          value={personId ?? undefined}
          onChange={handlePersonChange}
          placeholder="Search by name or email…"
          disabled={!canManage}
          className="w-full sm:max-w-md"
        />
      </div>

      <ScrollArea fill className={cn(SCROLL_AREA_PAGE_BODY_CLASS, "min-h-0 flex-1")}>
        {!person ? (
          <EmptyState
            illustrationPreset="team"
            title="Choose a member"
            description="Select whose personal data you need to export or erase. Erasure is permanent and blocked while a legal hold applies."
            className="flex-1 min-h-[40vh]"
          />
        ) : (
          <div className="flex flex-col gap-6 pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-11 shrink-0">
                <AvatarImage src={resolveImageUrl(person.image)} alt={displayName} />
                <AvatarFallback className="text-sm font-semibold">
                  {getUserInitials(person)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{person.email}</p>
              </div>
            </div>

            <div className="divide-y divide-border border-y border-border">
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Download className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Export their data</p>
                    <p className="text-xs leading-snug text-muted-foreground">
                      Instant download, or a full archive prepared in the background.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <LoadingButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    isPending={exportNow.isPending}
                    onClick={handleExport}
                  >
                    Download now
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    isPending={createJob.isPending}
                    onClick={handleArchive}
                  >
                    <FileArchive className="size-3.5" aria-hidden="true" />
                    Prepare archive
                  </LoadingButton>
                </div>
              </div>

              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive"
                    aria-hidden="true"
                  >
                    <Trash2 className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-medium text-foreground">Erase their data</p>
                    <p className="text-xs leading-snug text-muted-foreground">
                      Anonymises personal data across this organisation and purges stored files. Cannot be undone.
                    </p>
                    <p className="flex items-start gap-1.5 text-xs leading-snug text-muted-foreground">
                      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>Preview first if a legal hold might apply — a hold blocks erasure without deleting anything.</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <LoadingButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    isPending={erase.isPending && erase.variables?.dryRun === true}
                    onClick={handleDryRun}
                  >
                    Preview erasure
                  </LoadingButton>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={handleOpenErase}
                  >
                    Erase permanently…
                  </Button>
                </div>
              </div>
            </div>

            {jobId ? <ExportJobStatus jobId={jobId} /> : null}
          </div>
        )}
      </ScrollArea>

      {person ? (
        <TypedEmailConfirmDialog
          open={erasing}
          onOpenChange={setErasing}
          title={`Erase ${displayName}'s personal data?`}
          description="Their personal data is anonymised across this organisation and their stored files are purged. This cannot be undone."
          email={person.email}
          confirmLabel="Erase permanently"
          isPending={erase.isPending && erase.variables?.dryRun === false}
          withReason
          onConfirm={handleConfirmErase}
        />
      ) : null}
    </div>
  );
}
