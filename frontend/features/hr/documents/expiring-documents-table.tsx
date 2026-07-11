"use client";

import { AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ExpiringDoc {
  id: number;
  name: string;
  type: string;
  expiryDate: string;
  userId: string | null;
}

interface ExpiringCert {
  id: number;
  name: string;
  expiryDate: string;
  user?: { id: string; name: string | null } | null;
}

interface ExpiringDocumentsTableProps {
  expiringDocuments: ExpiringDoc[];
  expiringCertifications: ExpiringCert[];
  isLoading: boolean;
  className?: string;
}

function urgencyBadge(expiryDate: string) {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days <= 7) {
    return "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300";
  }
  if (days <= 14) {
    return "bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/40 dark:border-orange-800 dark:text-orange-300";
  }
  return "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300";
}

function urgencyLabel(expiryDate: string) {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days <= 0) return "Expired";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function ExpiringDocumentsTable({
  expiringDocuments,
  expiringCertifications,
  isLoading,
  className,
}: ExpiringDocumentsTableProps) {
  const all = [
    ...expiringDocuments.map((d) => ({ id: d.id, name: d.name, type: d.type, category: "Document", expiryDate: d.expiryDate })),
    ...expiringCertifications.map((c) => ({ id: c.id, name: c.name, type: "Certification", category: "Certification", expiryDate: c.expiryDate })),
  ].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card shadow-sm overflow-hidden", className)}>
        <div className="space-y-0 divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3.5 flex gap-3 items-center">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (all.length === 0) {
    return (
      <EmptyState
        illustration={<AlertTriangle className="h-8 w-8 text-emerald-500" />}
        title="No expiring items"
        description="All documents and certifications are up to date within the selected window."
        compact
      />
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-sm overflow-hidden", className)}>
      <ScrollArea className="w-full" type="auto">
        <div className="min-w-[480px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground/80">Name</TableHead>
                <TableHead className="font-semibold text-foreground/80">Category</TableHead>
                <TableHead className="font-semibold text-foreground/80">Expires</TableHead>
                <TableHead className="font-semibold text-foreground/80">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item, i) => (
                <TableRow key={`${item.category}-${item.id}-${i}`} className="transition-colors duration-200">
                  <TableCell>
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.type}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {format(parseISO(item.expiryDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        urgencyBadge(item.expiryDate),
                      )}
                    >
                      {urgencyLabel(item.expiryDate)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
