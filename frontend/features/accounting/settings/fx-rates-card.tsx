"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityFormDialog, ErrorState } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/api/access";
import { useCurrencies, useFxRates } from "@/hooks/api/accounting/ledger";
import { useUpsertFxRate } from "@/hooks/api/accounting/ledger-mutations";
import { formatRate } from "@/lib/accounting/money";
import { formatShortDate, getTodayString } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import type { FxRate } from "@/types/accounting-kernel";
import { fxRateFormSchema, type FxRateFormValues } from "./fx-rate-schema";

export function FxRatesCard({ baseCurrency }: { baseCurrency: string }) {
  const canManage = useCan("accounting:settings:manage");
  const [open, setOpen] = useState(false);

  const rates = useFxRates();
  const currencies = useCurrencies();
  const upsertRate = useUpsertFxRate();

  const currencyOptions = useMemo(
    () =>
      (currencies.data ?? []).map((currency) => ({
        value: currency.code,
        label: currency.code,
        sublabel: currency.name,
      })),
    [currencies.data],
  );

  const columns: DataTableColumn<FxRate>[] = [
    {
      key: "pair",
      header: "Pair",
      cell: (row) => (
        <span className="font-mono text-label">
          {row.fromCode} → {row.toCode}
        </span>
      ),
    },
    {
      key: "date",
      header: "On",
      className: "whitespace-nowrap font-mono text-dense tabular-nums",
      cell: (row) => formatShortDate(row.rateDate),
    },
    {
      key: "rate",
      header: "Rate",
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      cell: (row) => formatRate(row.rate),
    },
    {
      key: "source",
      header: "Where it came from",
      cell: (row) => <span className="text-muted-foreground">{row.source}</span>,
    },
  ];

  function handleSubmit(values: FxRateFormValues) {
    upsertRate.mutate(
      {
        fromCode: values.fromCode,
        toCode: values.toCode,
        rateDate: values.rateDate,
        rate: values.rate,
        source: "manual",
      },
      {
        onSuccess: () => {
          toast.success("Exchange rate saved");
          setOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
        <CardTitle className="text-sm font-semibold">Exchange rates</CardTitle>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Add a rate
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {rates.isError ? (
          <ErrorState
            compact
            className="m-4"
            title="Couldn't load exchange rates"
            description={getErrorMessage(rates.error)}
            onRetry={rates.refetch}
          />
        ) : (
          <DataTable
            data={rates.data ?? []}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={rates.isLoading}
            minWidth="640px"
            pagination={{ pageSize: 25 }}
            emptyState={
              <EmptyState
                compact
                className="min-h-[24vh] border-0 bg-transparent"
                title="No exchange rates yet"
                description={`Add a rate whenever you invoice or pay in a currency other than ${baseCurrency}.`}
              />
            }
          />
        )}
      </CardContent>

      <EntityFormDialog<FxRateFormValues>
        open={open}
        onOpenChange={setOpen}
        title="Add an exchange rate"
        description="One rate per pair per day. Saving again for the same day replaces it."
        resolver={zodResolver(fxRateFormSchema)}
        defaultValues={{
          fromCode: "",
          toCode: baseCurrency,
          rateDate: getTodayString(),
          rate: "",
        }}
        onSubmit={handleSubmit}
        isSubmitting={upsertRate.isPending}
        submitLabel="Save rate"
        resetOnOpen
      >
        {(form) => (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fromCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <FormControl>
                      <Combobox
                        options={currencyOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick a currency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Combobox
                        options={currencyOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick a currency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="rateDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>On this date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="83.25" {...field} />
                  </FormControl>
                  <FormDescription>
                    How many units of the second currency one unit of the first buys.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </EntityFormDialog>
    </Card>
  );
}
