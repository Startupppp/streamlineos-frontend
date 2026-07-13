"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  useEnterpriseQuotes,
  useCreateEnterpriseQuote,
  type EnterpriseQuoteStatus,
  type EnterpriseQuoteListItem,
} from "@/hooks/api/enterprise-quotes";
import { getApiError } from "@/lib/api-client";

const STATUS_CONFIG: Record<
  EnterpriseQuoteStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    className: "bg-amber-500/10 text-amber-600 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-muted/60 text-muted-foreground border-border",
  },
};

const STATUS_OPTIONS: Array<{ value: EnterpriseQuoteStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

const CONTRACT_TERMS: Array<{ value: 12 | 24 | 36; label: string }> = [
  { value: 12, label: "12 months" },
  { value: 24, label: "24 months" },
  { value: 36, label: "36 months" },
];

function fmtInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const newQuoteSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  requestedSeats: z
    .number({ message: "Required" })
    .int()
    .min(1, "Min 1 seat"),
  negotiatedSeats: z
    .number({ message: "Required" })
    .int()
    .min(1, "Min 1 seat"),
  pricePerSeatInr: z
    .number({ message: "Required" })
    .positive("Must be positive"),
  contractTermMonths: z.union([
    z.literal(12),
    z.literal(24),
    z.literal(36),
  ]),
  validUntil: z.string().min(1, "Valid until date is required"),
  contractTerms: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type NewQuoteFormValues = z.infer<typeof newQuoteSchema>;

function NewQuoteSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createQuote = useCreateEnterpriseQuote();
  const router = useRouter();

  const form = useForm<NewQuoteFormValues>({
    resolver: zodResolver(newQuoteSchema),
    defaultValues: {
      subject: "",
      requestedSeats: undefined,
      negotiatedSeats: undefined,
      pricePerSeatInr: undefined,
      contractTermMonths: 12,
      validUntil: "",
      contractTerms: "",
      notes: "",
    },
  });

  const watchedSeats = form.watch("negotiatedSeats");
  const watchedPrice = form.watch("pricePerSeatInr");
  const watchedTerm = form.watch("contractTermMonths");

  const totalValueInr =
    (watchedSeats ?? 0) * (watchedPrice ?? 0) * (watchedTerm ?? 0);

  function handleSubmit(values: NewQuoteFormValues) {
    createQuote.mutate(
      {
        subject: values.subject,
        requestedSeats: values.requestedSeats,
        negotiatedSeats: values.negotiatedSeats,
        pricePerSeatInPaise: Math.round(values.pricePerSeatInr * 100),
        contractTermMonths: values.contractTermMonths,
        validUntil: values.validUntil,
        contractTerms: values.contractTerms ?? undefined,
        notes: values.notes ?? undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(`Quote ${data.quoteRef} created`);
          form.reset();
          onOpenChange(false);
          router.push(`/billing/enterprise-quotes/${data.id}`);
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>New Enterprise Quote</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
        <Form {...form}>
          <form
            id="new-quote-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Enterprise plan — Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="requestedSeats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested Seats</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="50"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="negotiatedSeats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negotiated Seats</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="45"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="pricePerSeatInr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price / Seat / Month (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="500"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractTermMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Term</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v) as 12 | 24 | 36)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTRACT_TERMS.map((t) => (
                          <SelectItem key={t.value} value={String(t.value)}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid Until</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {totalValueInr > 0 && (
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Estimated Total Contract Value
                </p>
                <p className="text-lg font-bold mt-0.5">
                  {`₹${totalValueInr.toLocaleString("en-IN")}`}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="contractTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Terms (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Custom SLA, support terms, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Internal notes about this quote"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </form>
        </Form>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="new-quote-form" disabled={createQuote.isPending}>
            {createQuote.isPending ? "Creating…" : "Create Quote"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function EnterpriseQuotesPage() {
  const [statusFilter, setStatusFilter] = useState<
    EnterpriseQuoteStatus | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useEnterpriseQuotes({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    page,
  });

  const handleStatusChange = useCallback(
    (value: string) => {
      setStatusFilter(value as EnterpriseQuoteStatus | "ALL");
      setPage(1);
    },
    [],
  );

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  function handleRowClick(q: EnterpriseQuoteListItem) {
    router.push(`/billing/enterprise-quotes/${q.id}`);
  }

  function getQuoteRowKey(q: EnterpriseQuoteListItem) {
    return q.id;
  }

  const columns: DataTableColumn<EnterpriseQuoteListItem>[] = [
    {
      key: "quoteRef",
      header: "Quote Ref",
      cell: (q) => (
        <Link
          href={`/billing/enterprise-quotes/${q.id}`}
          className="font-mono text-xs font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {q.quoteRef}
        </Link>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      cell: (q) => (
        <span className="truncate text-sm block max-w-[200px]">{q.subject}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (q) => {
        const cfg = STATUS_CONFIG[q.status];
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "seats",
      header: "Seats",
      cell: (q) => (
        <span className="text-sm tabular-nums">{q.negotiatedSeats}</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "value",
      header: "Value",
      cell: (q) => (
        <span className="font-mono text-sm tabular-nums font-medium">
          {fmtInr(q.negotiatedSeats * q.pricePerSeatInPaise * q.contractTermMonths)}
        </span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "validUntil",
      header: "Valid Until",
      cell: (q) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(q.validUntil), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "deal",
      header: "Deal",
      cell: (q) => (
        <span className="text-sm text-muted-foreground truncate block max-w-[120px]">
          {q.dealName ?? "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (q) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(q.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Enterprise Quotes"
      subtitle="Custom pricing and seat negotiation for enterprise clients"
      actions={
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Quote
        </Button>
      }
      filters={
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-3">
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to load enterprise quotes.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            getRowKey={getQuoteRowKey}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            pagination={{
              mode: "server",
              page,
              pageSize: 20,
              total: data?.total ?? 0,
              onPageChange: setPage,
            }}
            emptyState={
              <EmptyState
                illustration={<EmptyDocumentsIllustration />}
                title="No enterprise quotes yet"
                description="Create a custom quote with negotiated pricing and seat counts for enterprise clients."
                action={{ label: "New Quote", onClick: handleOpenSheet }}
              />
            }
          />
        )}
      </div>

      <NewQuoteSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
