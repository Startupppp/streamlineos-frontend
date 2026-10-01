"use client";

import { useCallback, useMemo, useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatShortDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAcknowledgeDocument,
  useDocumentAcknowledgements,
  type DocumentAcknowledgement,
} from "@/hooks/api/hr/document-acknowledgements";

interface DocumentAcknowledgementsPanelProps {
  ownUserId?: string | null;
  allowAcknowledge?: boolean;
}

function acknowledgementName(row: DocumentAcknowledgement): string {
  return row.document?.name ?? `Document #${row.documentId}`;
}

export function DocumentAcknowledgementsPanel({
  ownUserId,
  allowAcknowledge = true,
}: DocumentAcknowledgementsPanelProps) {
  const [pendingOnly, setPendingOnly] = useState(true);
  const [target, setTarget] = useState<DocumentAcknowledgement | null>(null);
  const query = useDocumentAcknowledgements();
  const acknowledge = useAcknowledgeDocument();

  const rows = useMemo(() => {
    const all = query.data ?? [];
    const scoped = ownUserId ? all.filter((row) => row.userId === ownUserId) : all;
    return pendingOnly ? scoped.filter((row) => row.status === "PENDING") : scoped;
  }, [query.data, ownUserId, pendingOnly]);

  const handleRetry = useCallback(() => void query.refetch(), [query]);
  const handleTogglePendingOnly = useCallback(
    (next: boolean) => setPendingOnly(next),
    [],
  );
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setTarget(null);
  }, []);
  const handleConfirm = useCallback(() => {
    if (!target) return;
    acknowledge.mutate(target.id, {
      onSuccess: () => {
        toast.success("Acknowledged");
        setTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [acknowledge, target]);

  if (query.isLoading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );

  if (query.isError)
    return (
      <ErrorState
        compact
        title="Couldn't load acknowledgements"
        description={getErrorMessage(query.error)}
        onRetry={handleRetry}
      />
    );

  if (!query.isSuccess) return null;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-label font-semibold text-foreground">
            Acknowledgements
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="acknowledgements-pending-only"
            checked={pendingOnly}
            onCheckedChange={handleTogglePendingOnly}
          />
          <Label
            htmlFor="acknowledgements-pending-only"
            className="text-dense text-muted-foreground"
          >
            Pending only
          </Label>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-dense text-muted-foreground">
          {pendingOnly
            ? "Nothing waiting on an acknowledgement."
            : "No documents have been sent for acknowledgement."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const tone = statusToneClasses(
              row.status === "ACKNOWLEDGED" ? "success" : "warning",
            );
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label text-foreground">
                    {acknowledgementName(row)}
                  </p>
                  <p className="truncate text-dense text-muted-foreground">
                    {row.status === "ACKNOWLEDGED" && row.acknowledgedAt
                      ? `Acknowledged ${formatShortDate(row.acknowledgedAt)}`
                      : `Requested ${formatShortDate(row.createdAt)}`}
                    {ownUserId ? "" : ` · ${row.user?.name ?? row.userId}`}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`h-5 px-2 py-0.5 text-micro ${tone.surface} ${tone.ink} ${tone.rule}`}
                >
                  {row.status === "ACKNOWLEDGED" ? "Acked" : "Pending"}
                </Badge>
                {allowAcknowledge && row.status === "PENDING" ? (
                  <AcknowledgeButton row={row} onSelect={setTarget} />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={target !== null}
        onOpenChange={handleDialogOpenChange}
        title="Acknowledge this document?"
        description={`You confirm you have read "${target ? acknowledgementName(target) : ""}". The acknowledgement is recorded with the date and cannot be withdrawn here.`}
        confirmLabel="Acknowledge"
        icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
        keepOpenOnConfirm
        isPending={acknowledge.isPending}
        onConfirm={handleConfirm}
      />
    </section>
  );
}

interface AcknowledgeButtonProps {
  row: DocumentAcknowledgement;
  onSelect: (row: DocumentAcknowledgement) => void;
}

function AcknowledgeButton({ row, onSelect }: AcknowledgeButtonProps) {
  const handleClick = useCallback(() => onSelect(row), [onSelect, row]);
  return (
    <Button
      size="sm"
      variant="outline"
      className="min-h-11 sm:min-h-0"
      onClick={handleClick}
    >
      Acknowledge
    </Button>
  );
}
