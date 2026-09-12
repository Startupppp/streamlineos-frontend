"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountingBook } from "@/types/accounting-kernel";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

interface BookDetailsCardProps {
  book: AccountingBook | undefined;
  isLoading: boolean;
  taxRegistrationCount: number;
}

export function BookDetailsCard({
  book,
  isLoading,
  taxRegistrationCount,
}: BookDetailsCardProps) {
  return (
    <Card className="py-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold">Your books</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !book ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          <>
            <Detail label="Name" value={book.name} />
            <Detail label="Everything is reported in" value={book.baseCurrency} />
            <Detail
              label="Financial year starts"
              value={`${MONTHS[book.fiscalYearStartMonth - 1] ?? "January"} ${book.fiscalYearStartDay}`}
            />
            <Detail label="Country" value={book.countryCode} />
            <Detail label="Rule set" value={book.localizationPack} />
            <Detail label="Time zone" value={book.timezone} />
            <div className="min-w-0">
              <p className="text-dense font-medium text-muted-foreground">Status</p>
              <Badge variant="outline" className="mt-1 h-5 px-2 py-0.5 text-micro">
                {book.status === "ACTIVE" ? "In use" : "Archived"}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="text-dense font-medium text-muted-foreground">
                Tax registrations
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums">
                  {taxRegistrationCount}
                </span>
                <Button variant="outline" size="sm" className="h-7 text-dense" asChild>
                  <Link href="/accounting/setup">Manage</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-dense font-medium text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}
