"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { useEnableAccounting, useLocalizationPacks } from "@/hooks/api/accounting/ledger";
import { enableAccountingSchema, type EnableAccountingFormValues } from "./enable-accounting-schema";

interface EnableAccountingCardProps {
  onEnabled: () => void;
}

export function EnableAccountingCard({ onEnabled }: EnableAccountingCardProps) {
  const packsQuery = useLocalizationPacks();
  const enableAccounting = useEnableAccounting();
  const [selectedPack, setSelectedPack] = useState("IN");

  const form = useForm<EnableAccountingFormValues>({
    resolver: zodResolver(enableAccountingSchema),
    defaultValues: { countryCode: "IN", packCode: "IN", baseCurrency: "INR", name: "Primary book" },
  });

  const packs = useMemo(() => packsQuery.data ?? [], [packsQuery.data]);
  const activePack = useMemo(
    () => packs.find((pack) => pack.code === selectedPack),
    [packs, selectedPack],
  );

  function handlePackChange(code: string): void {
    setSelectedPack(code);
    form.setValue("packCode", code);
    const pack = packs.find((entry) => entry.code === code);
    if (!pack) return;
    form.setValue("baseCurrency", pack.defaultCurrency);
    const [firstCountry] = pack.countryCodes;
    if (firstCountry) form.setValue("countryCode", firstCountry);
  }

  function handleSubmit(values: EnableAccountingFormValues): void {
    enableAccounting.mutate(enableAccountingSchema.parse(values), {
      onSuccess: (result) => {
        toast.success(
          `Accounting is on. ${result.accountsSeeded} accounts created and financial year ${result.fiscalYear.name} opened.`,
        );
        onEnabled();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Turn on accounting</CardTitle>
        </div>
        <CardDescription>
          Tell us where the business is registered. We open your books, build a chart of accounts,
          open the current financial year and load that country&apos;s tax rates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="packCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select value={field.value} onValueChange={handlePackChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      {packs.map((pack) => (
                        <SelectItem key={pack.code} value={pack.code}>
                          <span className="flex items-center gap-2">
                            {pack.title}
                            {pack.status === "stub" ? (
                              <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
                                Manual tax
                              </Badge>
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {activePack?.status === "stub"
                      ? "Books and reports work fully. Tax has to be entered by hand until this country's pack ships."
                      : "Tax is worked out automatically for this country."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country code</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={2} placeholder="IN" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporting currency</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={3} placeholder="INR" />
                    </FormControl>
                    <FormDescription>Every report is shown in this currency.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Primary book" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="openFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Books start from</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    We open the financial year containing this date. Leave blank for today.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LoadingButton type="submit" isPending={enableAccounting.isPending}>
              Turn on accounting
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
