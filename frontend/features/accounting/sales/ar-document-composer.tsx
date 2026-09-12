"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import {
  CREDIT_NOTES_CREATE,
  RECEIVABLES_MANAGE,
  useCreateArInvoice,
  useCreateCreditNote,
} from "@/hooks/api/accounting/ar";
import { ArDocumentForm } from "./ar-document-form";
import { readArRejection } from "./ar-document-errors";
import {
  arDocumentFormSchema,
  emptyArDocumentForm,
  toCreateDocumentInput,
  type ArDocumentFormValues,
} from "./ar-document-schema";

type ComposerKind = "invoice" | "credit-note";

interface ArDocumentComposerProps {
  kind: ComposerKind;
}

const COPY: Readonly<
  Record<ComposerKind, { title: string; subtitle: string; back: string; submit: string }>
> = {
  invoice: {
    title: "New invoice",
    subtitle: "Draft it now, check the tax, then send it.",
    back: "/accounting/invoices",
    submit: "Save draft",
  },
  "credit-note": {
    title: "New credit note",
    subtitle: "Money you are giving back or writing off.",
    back: "/accounting/credit-notes",
    submit: "Save draft",
  },
};

function Composer({ kind, baseCurrency }: { kind: ComposerKind; baseCurrency: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorLineIndex, setErrorLineIndex] = useState<number | undefined>(undefined);
  const createInvoice = useCreateArInvoice();
  const createCreditNote = useCreateCreditNote();
  const copy = COPY[kind];

  const form = useForm<ArDocumentFormValues>({
    resolver: zodResolver(arDocumentFormSchema),
    defaultValues: emptyArDocumentForm(baseCurrency, searchParams.get("partyId") ?? ""),
  });

  const isPending = createInvoice.isPending || createCreditNote.isPending;

  function handleFailure(error: unknown): void {
    const rejection = readArRejection(error);
    setErrorLineIndex(rejection?.lineIndex);
    toast.error(getErrorMessage(error));
  }

  function handleSubmit(values: ArDocumentFormValues): void {
    setErrorLineIndex(undefined);
    const input = toCreateDocumentInput(values);
    if (kind === "invoice") {
      createInvoice.mutate(input, {
        onSuccess: (created) => {
          toast.success("Draft invoice saved");
          router.push(`/accounting/invoices/${created.id}`);
        },
        onError: handleFailure,
      });
      return;
    }
    createCreditNote.mutate(input, {
      onSuccess: (created) => {
        toast.success("Draft credit note saved");
        router.push(`/accounting/credit-notes/${created.id}`);
      },
      onError: handleFailure,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col gap-4">
        <ArDocumentForm form={form} errorLineIndex={errorLineIndex} disabled={isPending} />
        <div className="flex items-center justify-end gap-2 pb-4">
          <Button type="button" variant="outline" onClick={() => router.push(copy.back)}>
            Cancel
          </Button>
          <LoadingButton type="submit" isPending={isPending}>
            {copy.submit}
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

export function ArDocumentComposer({ kind }: ArDocumentComposerProps) {
  const permission = kind === "invoice" ? RECEIVABLES_MANAGE : CREDIT_NOTES_CREATE;
  const canCreate = useCan(permission);
  const bookQuery = useAccountingBook();
  const copy = COPY[kind];

  if (!canCreate) {
    return (
      <PageWrapper title={copy.title} backHref={copy.back}>
        <NoPermissionState permission={permission} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={copy.title} subtitle={copy.subtitle} backHref={copy.back}>
      {bookQuery.isError ? (
        <ErrorState
          className="flex-1"
          title="Your books aren't ready yet"
          description={getErrorMessage(bookQuery.error)}
          onRetry={() => void bookQuery.refetch()}
        />
      ) : bookQuery.isPending || !bookQuery.data ? (
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Composer kind={kind} baseCurrency={bookQuery.data.baseCurrency} />
      )}
    </PageWrapper>
  );
}
