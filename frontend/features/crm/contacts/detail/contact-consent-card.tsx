"use client";

import { useCallback, useMemo, useState } from "react";
import { ActivityIcon, PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm, renderFieldValue, resolveField, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  CONSENT_CHANNELS,
  CONSENT_LEGAL_BASES,
  CONSENT_STATUSES,
  CONTACT_CONSENT_LAYOUT,
} from "@/lib/renderer/crm/contact-consent-layout";
import { useContactConsent, useRecordConsent } from "@/hooks/api/crm";
import { useCan, useCanState } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ContactConsentHistory } from "./contact-consent-history";
import { getErrorMessage } from "@/lib/get-error-message";

interface ContactConsentCardProps {
  contactId: number;
}

export function ContactConsentCard({ contactId }: ContactConsentCardProps) {
  const layout = useTenantLayout(CONTACT_CONSENT_LAYOUT);
  const canManage = useCan("crm:contacts:manage");
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const history = useAnimatedIcon();
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: rows, isLoading, isError, error, refetch } = useContactConsent(contactId);
  const record = useRecordConsent();

  const channelField = resolveField(layout, "channel");
  const statusField = resolveField(layout, "status");
  const sourceField = resolveField(layout, "source");

  const ordered = useMemo(
    () =>
      [...(rows ?? [])].sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      ),
    [rows],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleOpenAdd = useCallback(() => setAddOpen(true), []);
  const handleOpenHistory = useCallback(() => setHistoryOpen(true), []);
  const handleCloseAdd = useCallback(() => setAddOpen(false), []);

  const handleSubmit = useCallback(
    (values: RecordFormValues) => {
      const channel = CONSENT_CHANNELS.find((candidate) => candidate === values.channel);
      const status = CONSENT_STATUSES.find((candidate) => candidate === values.status);
      if (!channel || !status) {
        toast.error("Choose a channel and whether they opted in.");
        return;
      }
      const legalBasis = CONSENT_LEGAL_BASES.find(
        (candidate) => candidate === values.legalBasis,
      );
      record.mutate(
        {
          contactId,
          input: {
            channel,
            status,
            legalBasis,
            sourceDetail: values.sourceDetail || undefined,
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

  if (useCanState("crm:contacts:view") === "denied")
    return <NoPermissionState permission="crm:contacts:view" />;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <CardTitle className="text-sm font-medium">Contact consent</CardTitle>
        <div className="flex items-center gap-gap-inline">
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2 text-xs"
            onClick={handleOpenHistory}
            {...history.hoverHandlers}
          >
            <ActivityIcon ref={history.iconRef} size={14} />
            History
          </Button>
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
        </div>
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

      <ContactConsentHistory
        contactId={contactId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

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
