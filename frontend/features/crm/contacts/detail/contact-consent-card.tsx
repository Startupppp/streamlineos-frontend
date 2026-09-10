"use client";

import { useCallback, useMemo, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm, renderFieldValue, resolveField, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { CONTACT_CONSENT_LAYOUT } from "@/lib/renderer/crm/contact-consent-layout";
import { useContactConsent, useRecordConsent, type ContactConsentRow } from "@/hooks/api/crm";
import { useCan, useCanState } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";

interface ContactConsentCardProps {
  contactId: number;
}

/**
 * What this person has agreed to be contacted about, and who says so.
 *
 * `/crm/consent/**` shipped with no caller in any branch of the frontend, so
 * there was no way to record consent, read it back, or answer an erasure
 * request from the product at all.
 *
 * What this shows is the CURRENT answer per channel, at most one row each:
 * `uniq_crm_consent_org_contact_channel` permits one row per contact per channel
 * and `record()` upserts onto it.
 *
 * It is deliberately not called a history, because the history is somewhere else
 * and is not reachable. `record()` also appends to `crm_contact_consent_events`,
 * an immutable trail that no service method and no route reads — so the product
 * records the evidence a DPDP audit would ask for and has no way to produce it.
 * Showing that trail needs a read endpoint first.
 */
export function ContactConsentCard({ contactId }: ContactConsentCardProps) {
  const layout = useTenantLayout(CONTACT_CONSENT_LAYOUT);
  const canManage = useCan("crm:contacts:manage");
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const [addOpen, setAddOpen] = useState(false);

  const { data: rows, isLoading, isError, error, refetch } = useContactConsent(contactId);
  const record = useRecordConsent();

  const channelField = resolveField(layout, "channel");
  const statusField = resolveField(layout, "status");
  const sourceField = resolveField(layout, "source");

  /*
   * Newest first. Not to build a history — there is at most one row per channel
   * — but because the route does a bare select with no `orderBy`, so the order
   * it returns is whatever the planner chose, which is stable enough to look
   * deliberate and is not. Five rows in a fixed order beats five in a drifting
   * one.
   */
  const ordered = useMemo(
    () =>
      [...(rows ?? [])].sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      ),
    [rows],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleOpenAdd = useCallback(() => setAddOpen(true), []);
  const handleCloseAdd = useCallback(() => setAddOpen(false), []);

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      if (!values.channel || !values.status) {
        toast.error("Choose a channel and whether they opted in.");
        return;
      }
      record.mutate(
        {
          contactId,
          input: {
            channel: values.channel as ContactConsentRow["channel"],
            status: values.status as ContactConsentRow["status"],
            /* Optional on the API; an empty control means "not stated", not an empty string. */
            legalBasis: values.legalBasis
              ? (values.legalBasis as NonNullable<ContactConsentRow["legalBasis"]>)
              : undefined,
            sourceDetail: values.sourceDetail || undefined,
            /* Empty means "does not lapse", which is a value and not a gap. */
            expiresAt: values.expiresAt || null,
          },
        },
        {
          onSuccess: () => {
            toast.success("Consent recorded");
            setAddOpen(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [contactId, record],
  );

  /* Checked before loading: a query never allowed to run has no loading state. */
  if (useCanState("crm:contacts:view") === "denied")
    return <NoPermissionState permission="crm:contacts:view" />;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <CardTitle className="text-sm font-medium">Contact consent</CardTitle>
        {canManage ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2 text-xs"
            onClick={handleOpenAdd}
            {...hoverHandlers}
          >
            <PlusIcon ref={iconRef} size={14} />
            Record consent
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="px-4 py-3">
        {isLoading ? (
          <div className="flex flex-col gap-gap-field">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load consent"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : ordered.length === 0 ? (
          <EmptyState
            compact
            className="border-0 bg-transparent py-4"
            title="No consent recorded"
            /*
             * Says what the absence means rather than that a list is empty. No
             * row is not "they said no" — it is that nobody has established a
             * basis for contacting them here, which is the thing a reviewer is
             * actually asking about.
             */
            description="Nothing here records a basis for contacting this person on any channel."
            action={canManage ? { label: "Record consent", onClick: handleOpenAdd } : undefined}
            actionVariant="outline"
          />
        ) : (
          <ul className="flex flex-col gap-gap-field">
            {ordered.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-gap-inline">
                {renderFieldValue(channelField, row.channel)}
                {renderFieldValue(statusField, row.status)}
                {renderFieldValue(sourceField, row.source)}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(row.capturedAt).toLocaleDateString()}
                </span>
                {row.expiresAt ? (
                  <span className="text-xs text-muted-foreground">
                    expires {new Date(row.expiresAt).toLocaleDateString()}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AppDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Record consent"
        description="Recorded against you as the colleague who entered it."
      >
        <RecordForm
          layout={layout}
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCloseAdd}
          isSubmitting={record.isPending}
        />
      </AppDialog>
    </Card>
  );
}
