"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { withColumns } from "@/lib/renderer/layout-adjustment";
import { QUOTE_LAYOUT, quoteListRecordFields } from "@/lib/renderer/crm/quote-layout";
import { useCan } from "@/hooks/api/access";
import {
  useCreateQuote,
  useDealQuotes,
  useDeleteQuote,
  useUpdateQuoteStatus,
} from "@/hooks/api/crm/quotes";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import type { QuoteStatus } from "@/types/crm/quotes";

/**
 * The quotes on a deal, rendered from the quote description.
 *
 * This was a second implementation of the quotes list: its own row card, its own
 * `STATUS_CONFIG` mapping five statuses to five tone classes, and its own
 * `formatAmount(amount, currency = "USD")` fixed to `en-US` — so a quote written
 * in rupees was grouped in thousands on the deal page and in lakhs on the quotes
 * page, and a quote with no currency was priced in dollars. None of that was a
 * decision anybody made; it is what happens when one record has two lists.
 *
 * It is now the same description, narrowed to the four columns that fit beside a
 * deal. `withColumns` narrows what the tenant already sees rather than declaring
 * a second, smaller layout — so a column a tenant hid on the quotes page cannot
 * reappear here, and the status tones come from the one place that names them.
 */

const EMBEDDED_COLUMNS = ["quoteNumber", "status", "netAmount", "validUntil"] as const;

/** The quote a fresh row starts as, until somebody opens it and prices it. */
const QUOTE_VALID_DAYS = 30;

interface QuoteRowActionsProps {
  quote: RecordValue;
  dealId: number;
  onDeleteRequest: (id: number) => void;
}

function QuoteRowActions({ quote, dealId, onDeleteRequest }: QuoteRowActionsProps) {
  const updateStatus = useUpdateQuoteStatus();
  const id = Number(quote.id);
  const status = typeof quote.status === "string" ? quote.status : "";
  const quoteNumber = typeof quote.quoteNumber === "string" ? quote.quoteNumber : "this quote";

  const changeStatus = useCallback(
    (next: QuoteStatus) => {
      updateStatus.mutate(
        { id, status: next, dealId },
        {
          onSuccess: () => toast.success("Quote updated"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [id, dealId, updateStatus],
  );

  const handleMarkSent = useCallback(() => changeStatus("SENT"), [changeStatus]);
  const handleMarkAccepted = useCallback(() => changeStatus("ACCEPTED"), [changeStatus]);
  const handleMarkRejected = useCallback(() => changeStatus("REJECTED"), [changeStatus]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(id), [id, onDeleteRequest]);

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 px-2 text-xs"
            disabled={updateStatus.isPending}
            aria-label={`Actions for ${quoteNumber}`}
          >
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {status === "DRAFT" ? (
            <DropdownMenuItem onClick={handleMarkSent}>Mark as sent</DropdownMenuItem>
          ) : null}
          {status === "SENT" ? (
            <>
              <DropdownMenuItem onClick={handleMarkAccepted}>Mark accepted</DropdownMenuItem>
              <DropdownMenuItem onClick={handleMarkRejected}>Mark rejected</DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuItem variant="destructive" onClick={handleDeleteRequest}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface DealQuotesSectionProps {
  dealId: number;
}

export function DealQuotesSection({ dealId }: DealQuotesSectionProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, isLoading, isError, refetch, access} = useDealQuotes(dealId);
  const canCreateQuote = useCan("crm:quotes:create");
  const createQuote = useCreateQuote();
  const deleteQuote = useDeleteQuote();
  const money = useOrgDisplay();
  const [density] = useDensity();

  const tenantLayout = useTenantLayout(QUOTE_LAYOUT);
  const layout = useMemo(() => withColumns(tenantLayout, EMBEDDED_COLUMNS), [tenantLayout]);

  const rows = useMemo(
    () => asRecordValues((data?.quotes ?? []).map(quoteListRecordFields)),
    [data?.quotes],
  );

  const handleCreateQuote = useCallback(() => {
    const validUntil = new Date(Date.now() + QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    createQuote.mutate(
      {
        dealId,
        subject: "New Quote",
        validUntil,
        lineItems: [{ description: "Service", quantity: 1, unitPrice: 0 }],
      },
      {
        onSuccess: () => toast.success("Quote created"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [dealId, createQuote]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteRequest = useCallback((id: number) => setDeleteId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId === null) return;
    deleteQuote.mutate(
      { id: deleteId, dealId },
      {
        onSuccess: () => {
          toast.success("Quote deleted");
          setDeleteId(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [deleteId, dealId, deleteQuote]);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const renderActions = useCallback(
    (row: RecordValue) => (
      <QuoteRowActions quote={row} dealId={dealId} onDeleteRequest={handleDeleteRequest} />
    ),
    [dealId, handleDeleteRequest],
  );

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Quotes</h3>
            {rows.length > 0 ? (
              <Badge variant="secondary" className="text-micro h-4 px-1.5">
                {rows.length}
              </Badge>
            ) : null}
          </div>
          {canCreateQuote ? (
            <LoadingButton
              size="sm"
              onClick={handleCreateQuote}
              isPending={createQuote.isPending}
              loadingText="Creating…"
            >
              <Plus className="mr-1 h-3 w-3" />
              New quote
            </LoadingButton>
          ) : null}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <DataTableSkeleton rows={3} columns={EMBEDDED_COLUMNS.length} />
          ) : isError ? (
            <ErrorState
              compact
              title="Couldn't load quotes"
              description="The quotes on this deal didn't load. Check your connection and try again."
              onRetry={handleRetry}
            />
          ) : rows.length === 0 ? (
            <EmptyState
            access={access}
              compact
              title="No quotes yet"
              description="A quote prices this deal for the client, line by line. Create one to send it out."
              action={
                canCreateQuote ? { label: "New quote", onClick: handleCreateQuote } : undefined
              }
            />
          ) : (
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.id)}
              actions={renderActions}
              density={density}
              money={money}
              minWidth="520px"
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the quote. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
