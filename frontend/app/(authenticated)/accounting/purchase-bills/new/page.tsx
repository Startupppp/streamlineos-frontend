import { ApDocumentNewPage } from "@/features/accounting/purchases/bills/ap-document-new-page";

export default function AccountingNewBillPage() {
  return (
    <ApDocumentNewPage
      documentType="BILL"
      title="Enter a bill"
      subtitle="A bill starts as a draft. Nothing reaches the books until you put it there."
      backHref="/accounting/purchase-bills"
      backLabel="Back to bills"
    />
  );
}
