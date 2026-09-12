import { ApDocumentsPage } from "@/features/accounting/purchases/bills/ap-documents-page";

export default function AccountingVendorCreditsPage() {
  return (
    <ApDocumentsPage
      documentType="DEBIT_NOTE"
      title="Credits from vendors"
      subtitle="Money a vendor owes you back, and how much of it you have used."
      createLabel="Enter a credit"
      createHref="/accounting/vendor-credits/new"
      emptyTitle="No vendor credits yet"
      emptyDescription="When a vendor credits you for a returned or over-billed item, record it here."
    />
  );
}
