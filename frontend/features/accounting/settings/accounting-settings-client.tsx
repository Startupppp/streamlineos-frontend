"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useAccountingBook,
  useBookCurrencies,
  useTaxRegistrations,
} from "@/hooks/api/accounting/ledger";
import { AccountMappingsCard } from "./account-mappings-card";
import { BookDetailsCard } from "./book-details-card";
import { CurrenciesCard } from "./currencies-card";
import { FxConverterCard } from "./fx-converter-card";
import { FxRatesCard } from "./fx-rates-card";

export function AccountingSettingsClient() {
  const book = useAccountingBook();
  const currencies = useBookCurrencies();
  const registrations = useTaxRegistrations();

  const pageState = usePageState({
    permission: "accounting:read",
    isLoading: book.isLoading,
    isError: book.isError,
    error: book.error,
  });
  const handleRetry = useCallback(() => { void book.refetch(); }, [book]);

  const baseCurrency = book.data?.baseCurrency ?? "";

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Accounting settings">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Accounting settings"
      subtitle="How your books are set up, the currencies you use, and the rates that convert them."
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 pb-4">
        <BookDetailsCard
          book={book.data}
          isLoading={book.isLoading}
          taxRegistrationCount={registrations.data?.length ?? 0}
        />
        <AccountMappingsCard enabled={Boolean(book.data)} />
        <CurrenciesCard currencies={currencies.data} isLoading={currencies.isLoading} />
        <FxRatesCard baseCurrency={baseCurrency} />
        <FxConverterCard baseCurrency={baseCurrency} />
      </div>
    </PageWrapper>
  );
}
