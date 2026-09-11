"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import {
  useAccountingBook,
  useBookCurrencies,
  useTaxRegistrations,
} from "@/hooks/api/accounting/ledger";
import { getErrorMessage } from "@/lib/get-error-message";
import { AccountMappingsCard } from "./account-mappings-card";
import { BookDetailsCard } from "./book-details-card";
import { CurrenciesCard } from "./currencies-card";
import { FxConverterCard } from "./fx-converter-card";
import { FxRatesCard } from "./fx-rates-card";

export function AccountingSettingsClient() {
  const canRead = useCan("accounting:read");

  const book = useAccountingBook();
  const currencies = useBookCurrencies();
  const registrations = useTaxRegistrations();

  const baseCurrency = book.data?.baseCurrency ?? "";

  return (
    <PageWrapper
      title="Accounting settings"
      subtitle="How your books are set up, the currencies you use, and the rates that convert them."
    >
      {!canRead ? (
        <NoPermissionState permission="accounting:read" />
      ) : book.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load your accounting settings"
          description={getErrorMessage(book.error)}
          onRetry={book.refetch}
        />
      ) : (
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
      )}
    </PageWrapper>
  );
}
