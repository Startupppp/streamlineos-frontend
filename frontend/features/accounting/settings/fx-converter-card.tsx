"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCurrencies } from "@/hooks/api/accounting/ledger";
import { usePreviewFx } from "@/hooks/api/accounting/ledger-mutations";
import { formatRate, parseMoneyInput } from "@/lib/accounting/money";
import { getTodayString } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import type { FxPreview } from "@/types/accounting-kernel-ext";

export function FxConverterCard({ baseCurrency }: { baseCurrency: string }) {
  const currencies = useCurrencies();
  const previewFx = usePreviewFx();

  const [amount, setAmount] = useState("");
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState(baseCurrency);
  const [onDate, setOnDate] = useState(getTodayString);
  const [preview, setPreview] = useState<FxPreview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const currencyOptions = useMemo(
    () =>
      (currencies.data ?? []).map((currency) => ({
        value: currency.code,
        label: currency.code,
        sublabel: currency.name,
      })),
    [currencies.data],
  );

  function handlePreview() {
    setPreview(null);
    setProblem(null);

    const amountMinor = fromCode ? parseMoneyInput(amount, fromCode) : null;
    if (amountMinor === null || amountMinor <= 0) {
      setProblem(`Enter an amount in ${fromCode || "the currency you are converting from"}.`);
      return;
    }
    if (!toCode) {
      setProblem("Pick the currency you are converting to.");
      return;
    }

    previewFx.mutate(
      { amountMinor, fromCode, toCode, onDate },
      {
        onSuccess: (result) => setPreview(result),
        onError: (error) => setProblem(getErrorMessage(error)),
      },
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold">Try a conversion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="fx-amount">Amount</Label>
            <Input
              id="fx-amount"
              inputMode="decimal"
              placeholder="1000.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="text-right font-mono tabular-nums"
            />
          </div>
          <div className="grid gap-2">
            <Label>From</Label>
            <Combobox
              options={currencyOptions}
              value={fromCode}
              onChange={setFromCode}
              placeholder="Currency"
            />
          </div>
          <div className="grid gap-2">
            <Label>To</Label>
            <Combobox
              options={currencyOptions}
              value={toCode}
              onChange={setToCode}
              placeholder="Currency"
            />
          </div>
          <div className="grid gap-2">
            <Label>On</Label>
            <DatePicker value={onDate} onChange={setOnDate} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton
            type="button"
            size="sm"
            isPending={previewFx.isPending}
            onClick={handlePreview}
          >
            Convert
          </LoadingButton>
          {problem ? (
            <p className="text-xs text-destructive" role="alert">
              {problem}
            </p>
          ) : null}
        </div>

        {preview ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="font-mono text-sm font-semibold tabular-nums">
              {preview.from.display} = {preview.to.display}
            </p>
            <p className="mt-1 text-label text-muted-foreground">
              Using the rate {formatRate(preview.rate)} recorded for {preview.rateDate}.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
