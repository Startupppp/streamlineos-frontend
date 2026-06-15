"use client";

import { useState, useCallback, useTransition, memo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuotes, useCreateQuote } from "@/lib/api/hooks/quotes";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { Plus, Search, FileText, Download, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  SENT: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ACCEPTED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
  EXPIRED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};


interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface LineItemRowProps {
  item: LineItem;
  idx: number;
  isFirst: boolean;
  canRemove: boolean;
  onUpdate: (idx: number, field: string, value: string | number) => void;
  onRemove: (idx: number) => void;
}

const LineItemRow = memo(function LineItemRow({ item, idx, isFirst, canRemove, onUpdate, onRemove }: LineItemRowProps) {
  const handleDescription = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "description", e.target.value), [onUpdate, idx]);
  const handleQuantity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "quantity", Number(e.target.value)), [onUpdate, idx]);
  const handleUnitPrice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "unitPrice", Number(e.target.value)), [onUpdate, idx]);
  const handleTaxRate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "taxRate", Number(e.target.value)), [onUpdate, idx]);
  const handleRemove = useCallback(() => onRemove(idx), [onRemove, idx]);

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-12 sm:col-span-5">
        {isFirst && <span className="text-xs text-muted-foreground">Description</span>}
        <Input value={item.description} onChange={handleDescription} placeholder="Item description" />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <span className="text-xs text-muted-foreground sm:hidden">Qty</span>
        {isFirst && <span className="text-xs text-muted-foreground hidden sm:inline">Qty</span>}
        <Input type="number" min={0} value={item.quantity} onChange={handleQuantity} />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <span className="text-xs text-muted-foreground sm:hidden">Price</span>
        {isFirst && <span className="text-xs text-muted-foreground hidden sm:inline">Price</span>}
        <Input type="number" min={0} value={item.unitPrice} onChange={handleUnitPrice} />
      </div>
      <div className="col-span-3 sm:col-span-2">
        <span className="text-xs text-muted-foreground sm:hidden">Tax %</span>
        {isFirst && <span className="text-xs text-muted-foreground hidden sm:inline">Tax %</span>}
        <Input type="number" min={0} value={item.taxRate} onChange={handleTaxRate} />
      </div>
      <div className="col-span-1">
        <Button type="button" variant="ghost" size="icon" onClick={handleRemove} disabled={!canRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});


function CreateQuoteForm({ onSuccess }: { onSuccess: () => void }) {
  const createQuote = useCreateQuote();
  const [subject, setSubject] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);

  const addLine = useCallback(() => setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, taxRate: 0 }]), []);

  const updateLine = useCallback((idx: number, field: string, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }, []);

  const removeLine = useCallback((idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value), []);
  const handleValidUntilChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setValidUntil(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !validUntil) {
      toast.error("Please fill all required fields");
      return;
    }
    if (lineItems.some((li) => !li.description.trim())) {
      toast.error("Every line item needs a description");
      return;
    }
    const cleanedItems = lineItems.map((li) => ({ ...li, description: li.description.trim() }));
    createQuote.mutate(
      { subject: subject.trim(), validUntil, notes: notes || undefined, lineItems: cleanedItems },
      {
        onSuccess: () => {
          toast.success("Quote created successfully");
          onSuccess();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Subject *</Label>
          <Input value={subject} onChange={handleSubjectChange} placeholder="Quote subject" />
        </div>
        <div>
          <Label>Valid Until *</Label>
          <Input type="date" value={validUntil} onChange={handleValidUntilChange} />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Line Items</Label>
        <div className="space-y-2">
          {lineItems.map((item, idx) => (
            <LineItemRow
              key={idx}
              item={item}
              idx={idx}
              isFirst={idx === 0}
              canRemove={lineItems.length > 1}
              onUpdate={updateLine}
              onRemove={removeLine}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addLine} className="mt-2">
          <Plus className="mr-1 h-3 w-3" /> Add Line
        </Button>
        <p className="text-sm text-right mt-2 font-medium">
          Subtotal: INR {total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={handleNotesChange} rows={2} />
      </div>

      <Button type="submit" className="w-full" disabled={createQuote.isPending}>
        {createQuote.isPending ? "Creating..." : "Create Quote"}
      </Button>
    </form>
  );
}


export default function QuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const search = searchParams.get("q") || "";
  const debouncedSearch = useDebouncedValue(search, 300);
  const statusFilter = searchParams.get("status") || "all";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading } = useQuotes({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => updateParams({ q: e.target.value }),
    [updateParams],
  );

  const handleStatusFilter = useCallback(
    (v: string) => updateParams({ status: v === "all" ? null : v }),
    [updateParams],
  );

  const handleCreateOpenChange = useCallback((open: boolean) => setCreateOpen(open), []);
  const handleCreateSuccess = useCallback(() => setCreateOpen(false), []);

  return (
    <PageWrapper
      title="Quotes"
      subtitle="Create and manage sales quotes for your deals"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/quotes/export" download>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
            </a>
          </Button>
          <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Quote</DialogTitle>
              </DialogHeader>
              <CreateQuoteForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data?.quotes?.length ? (
        <EmptyState
          icon={FileText}
          title="No quotes found"
          description="Create your first quote to start closing deals."
          action={{ label: "New Quote", onClick: () => setCreateOpen(true) }}
          className="flex-1"
        />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.quotes.map((q) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/crm/quotes/${q.id}`} className="font-mono text-sm text-blue-600 hover:underline">
                      {q.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/crm/quotes/${q.id}`} className="font-medium hover:underline">
                      {q.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[q.status]}>
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.deal?.name || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {q.currency} {Number(q.netAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.validUntil ? format(new Date(q.validUntil), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.createdAt ? format(new Date(q.createdAt), "dd MMM yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
