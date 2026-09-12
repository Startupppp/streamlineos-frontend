"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookCurrency } from "@/types/accounting-kernel-ext";

interface CurrenciesCardProps {
  currencies: BookCurrency[] | undefined;
  isLoading: boolean;
}

export function CurrenciesCard({ currencies, isLoading }: CurrenciesCardProps) {
  return (
    <Card className="py-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold">Currencies you can bill in</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
        ) : (currencies ?? []).length === 0 ? (
          <p className="text-label text-muted-foreground">
            Only your base currency is enabled.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {(currencies ?? []).map((currency) => (
              <li key={currency.currencyCode}>
                <Badge variant="outline" className="h-7 gap-2 px-2 py-0.5 text-xs">
                  <span className="font-mono">{currency.currencyCode}</span>
                  <span className="text-muted-foreground">{currency.name}</span>
                  {currency.isBase ? (
                    <span className="rounded bg-primary/10 px-1 text-micro font-semibold text-primary">
                      Books are kept in this
                    </span>
                  ) : null}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
