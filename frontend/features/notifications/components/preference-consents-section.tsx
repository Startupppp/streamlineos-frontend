"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useNotificationConsents, useRecordNotificationConsent } from "@/hooks/api/notifications-preferences";
import type { NotificationConsent } from "@/hooks/api/notifications-schema";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { consentSchema, type ConsentValues } from "@/features/notifications/consent-schema";

const CHANNEL_LABEL: Record<string, string> = { SMS: "SMS", WHATSAPP: "WhatsApp" };
const DEFAULT_VALUES: ConsentValues = { channel: "SMS", destination: "" };

function consentKey(row: NotificationConsent): string {
  return `${row.channel}:${row.destination}`;
}

interface ConsentRowProps {
  row: NotificationConsent;
  pendingKey: string | null;
  onToggle: (row: NotificationConsent) => void;
}

function ConsentRow({ row, pendingKey, onToggle }: ConsentRowProps) {
  const granted = row.state === "GRANTED";
  function handleToggle() {
    onToggle(row);
  }
  return (
    <div className="flex items-center justify-between gap-3 bg-card px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{row.destination}</p>
          <SemanticBadge tone={granted ? "success" : "neutral"} label={granted ? "Granted" : "Withdrawn"} size="xs" />
        </div>
        <p className="text-xs text-muted-foreground">
          {CHANNEL_LABEL[row.channel] ?? row.channel} · {granted ? `granted ${formatDateTime(row.grantedAt)}` : `withdrawn ${formatDateTime(row.withdrawnAt)}`}
        </p>
      </div>
      <LoadingButton type="button" size="sm" variant="outline" isPending={pendingKey === consentKey(row)} onClick={handleToggle}>
        {granted ? "Withdraw" : "Grant again"}
      </LoadingButton>
    </div>
  );
}

export function PreferenceConsentsSection() {
  const consents = useNotificationConsents();
  const record = useRecordNotificationConsent();
  const [adding, setAdding] = useState(false);
  const pendingKey = record.isPending && record.variables ? `${record.variables.channel}:${record.variables.destination}` : null;

  function handleToggle(row: NotificationConsent) {
    if (row.channel !== "SMS" && row.channel !== "WHATSAPP") return;
    const state = row.state === "GRANTED" ? "WITHDRAWN" : "GRANTED";
    record.mutate(
      { channel: row.channel, destination: row.destination, state },
      {
        onSuccess: () => toast.success(state === "GRANTED" ? "Consent granted" : "Consent withdrawn"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleAdd(values: ConsentValues) {
    record.mutate(
      { ...values, state: "GRANTED" },
      {
        onSuccess: () => {
          toast.success(`Consent granted for ${values.destination}`);
          setAdding(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleOpenAdd() {
    setAdding(true);
  }

  function handleRetry() {
    void consents.refetch();
  }

  const rows = consents.data ?? [];

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Messaging consent</h2>
        <Button type="button" size="sm" variant="ghost" onClick={handleOpenAdd}>
          Add a number
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        {consents.isLoading ? (
          <div className="flex items-center justify-between gap-3 bg-card px-3 py-2.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ) : consents.isError ? (
          <ErrorState compact title="Couldn't load your consents" error={consents.error} onRetry={handleRetry} />
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            className="bg-card py-8"
            title="No messaging consent recorded"
            description="SMS and WhatsApp notifications reach only a number you have agreed to receive them on."
          />
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <ConsentRow key={consentKey(row)} row={row} pendingKey={pendingKey} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>
      <EntityFormDialog<ConsentValues>
        open={adding}
        onOpenChange={setAdding}
        title="Agree to messages on a number"
        description="Notifications on this channel are sent to this number until you withdraw."
        resolver={zodResolver(consentSchema)}
        defaultValues={DEFAULT_VALUES}
        onSubmit={handleAdd}
        isSubmitting={record.isPending}
        submitLabel="Grant consent"
        resetOnOpen
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormDialog>
    </section>
  );
}
