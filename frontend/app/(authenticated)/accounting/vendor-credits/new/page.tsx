import { ApDocumentNewPage } from "@/features/accounting/purchases/bills/ap-document-new-page";

export default function AccountingNewVendorCreditPage() {
  return (
    <ApDocumentNewPage
      documentType="DEBIT_NOTE"
      title="Enter a vendor credit"
      subtitle="What the vendor is crediting you for. It starts as a draft until you put it in the books."
      backHref="/accounting/vendor-credits"
      backLabel="Back to credits"
    />
  );
}
