import { ApDocumentsPage } from "@/features/accounting/purchases/bills/ap-documents-page";

export default function AccountingPurchaseBillsPage() {
  return (
    <ApDocumentsPage
      documentType="BILL"
      title="What we owe"
      subtitle="Every bill a vendor has sent you, and how much of it is still outstanding."
      createLabel="Enter a bill"
      createHref="/accounting/purchase-bills/new"
      emptyTitle="No bills yet"
      emptyDescription="Enter a vendor's bill and it will sit as a draft until you put it in the books."
    />
  );
}
