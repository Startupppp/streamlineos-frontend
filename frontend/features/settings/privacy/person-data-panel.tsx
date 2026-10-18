"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileArchive, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { MemberPicker } from "@/components/members/member-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  RichIconWell,
  RichPageContent,
  RichPanel,
} from "@/components/shared/rich-surface";
import { useMemberDirectory, type DirectoryScope } from "@/hooks/api/members/use-member-directory";
import { useCan } from "@/hooks/api/access";
import { useCreatePersonExportJob, useEraseSubject, useExportPersonData } from "@/hooks/api/privacy/gdpr";
import type { GdprErasureResult } from "@/hooks/api/privacy/gdpr-schema";
import { useMotionVariants } from "@/lib/motion-variants";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { cn, resolveImageUrl } from "@/lib/utils";
import { ExportJobStatus } from "./export-job-status";
import { PrivacyActionRow } from "./privacy-action-row";
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
  const motionVariants = useMotionVariants();
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
  const ready = Boolean(person) && canManage;

  return (
    <RichPageContent className="min-h-0 flex-1 overflow-y-auto pb-1">
      <RichPanel padded={false}>
        <div className="flex items-start gap-2.5 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <RichIconWell tone="blue" size="sm" className="mt-0.5">
            <UserRound className="size-3.5" aria-hidden="true" />
          </RichIconWell>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Choose whose data you are acting on
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Exports and erasures apply only to this member. Preview erasure first if a legal hold might apply.
            </p>
          </div>
        </div>
        <div className="flex max-w-xl flex-col gap-3 px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-1.5">
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
              className="w-full"
            />
          </div>

          {person ? (
            <motion.div
              key={person.id}
              variants={motionVariants.fadeIn}
              initial="hidden"
              animate="visible"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-inset px-3 py-2.5 dark:border-background"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={resolveImageUrl(person.image)} alt={displayName} />
                <AvatarFallback className="text-sm font-semibold">
                  {getUserInitials(person)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{person.email}</p>
              </div>
            </motion.div>
          ) : (
            <p className="text-xs leading-snug text-muted-foreground">
              Select a member to unlock export and erasure.
            </p>
          )}
        </div>
      </RichPanel>

      <RichPanel padded={false} className={cn(!ready && "opacity-70")}>
        <div className="flex items-start gap-2.5 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <RichIconWell tone="blue" size="sm" className="mt-0.5">
            <Download className="size-3.5" aria-hidden="true" />
          </RichIconWell>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Export a copy</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Download personal data now, or prepare a full archive in the background.
            </p>
          </div>
        </div>
        <div className="px-4 sm:px-5">
          <PrivacyActionRow
            title="Instant download"
            description="A portable copy of this member's personal data, ready right away."
          >
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              disabled={!ready}
              isPending={exportNow.isPending}
              onClick={handleExport}
            >
              Download now
            </LoadingButton>
          </PrivacyActionRow>
          <PrivacyActionRow
            title="Full archive"
            description="A background job that packages everything available. You can download it when it is ready."
            showBorder={false}
          >
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              disabled={!ready}
              isPending={createJob.isPending}
              onClick={handleArchive}
            >
              <FileArchive className="size-3.5" aria-hidden="true" />
              Prepare archive
            </LoadingButton>
          </PrivacyActionRow>
          {jobId ? (
            <div className="border-t border-border/60 py-3.5">
              <ExportJobStatus jobId={jobId} />
            </div>
          ) : null}
        </div>
      </RichPanel>

      <RichPanel padded={false} className={cn("border-destructive/40", !ready && "opacity-70")}>
        <div className="flex items-start gap-2.5 border-b border-destructive/20 px-4 py-3.5 sm:px-5">
          <RichIconWell tone="rose" size="sm" className="mt-0.5">
            <Trash2 className="size-3.5" aria-hidden="true" />
          </RichIconWell>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-destructive">Erase their data</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Anonymises personal data and purges stored files. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="px-4 sm:px-5">
          <div className="flex items-start gap-2 rounded-xl border border-status-warning-rule bg-status-warning-surface px-3 py-2.5 my-3.5">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-status-warning-ink" aria-hidden="true" />
            <p className="text-xs leading-snug text-status-warning-ink">
              Preview first. A legal hold blocks erasure and deletes nothing.
            </p>
          </div>
          <PrivacyActionRow
            title="Preview erasure"
            description="See what would be anonymised without changing any records."
          >
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              disabled={!ready}
              isPending={erase.isPending && erase.variables?.dryRun === true}
              onClick={handleDryRun}
            >
              Preview erasure
            </LoadingButton>
          </PrivacyActionRow>
          <PrivacyActionRow
            title="Erase permanently"
            description="Requires typing the member's email to confirm."
            showBorder={false}
          >
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!ready}
              onClick={handleOpenErase}
            >
              Erase permanently…
            </Button>
          </PrivacyActionRow>
        </div>
      </RichPanel>

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
    </RichPageContent>
  );
}
