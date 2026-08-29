import { format } from "date-fns";
import type { Invoice } from "@/types/invoice";
import { formatInvoiceAmount } from "./invoice-detail-utils";

export async function downloadInvoicePdf(invoice: Invoice) {
  const { default: jsPDF } = await import("jspdf");
  const document = new jsPDF();
  document.setFontSize(22);
  document.text("INVOICE", 20, 25);
  document.setFontSize(10);
  document.setTextColor(100);
  document.text("StreamlineOS — Capital Advisors LLP", 20, 33);
  document.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 40);
  document.text(`Date: ${format(new Date(invoice.createdAt), "dd MMM yyyy")}`, 20, 47);
  if (invoice.dueDate) {
    document.text(`Due: ${format(new Date(invoice.dueDate), "dd MMM yyyy")}`, 20, 54);
  }
  document.setDrawColor(189, 136, 44);
  document.line(20, 60, 190, 60);
  if (invoice.client) {
    document.setTextColor(0);
    document.setFontSize(12);
    document.text(`Bill To: ${invoice.client.name}`, 20, 70);
  }
  document.setFontSize(10);
  document.setTextColor(100);
  let y = 85;
  document.text("Description", 20, y);
  document.text("Qty", 110, y);
  document.text("Rate", 135, y);
  document.text("Amount", 165, y);
  document.line(20, y + 3, 190, y + 3);
  y += 10;
  document.setTextColor(0);
  for (const item of invoice.lineItems) {
    document.text(item.description, 20, y);
    document.text(String(item.quantity), 110, y);
    document.text(formatInvoiceAmount(item.rate), 135, y);
    document.text(formatInvoiceAmount(item.amount), 165, y);
    y += 8;
  }
  document.line(20, y + 2, 190, y + 2);
  y += 10;
  document.text(`Subtotal: ${formatInvoiceAmount(invoice.subtotal)}`, 130, y);
  y += 7;
  if (Number(invoice.taxRate)) {
    document.text(`Tax (${invoice.taxRate}%): ${formatInvoiceAmount(invoice.taxAmount ?? 0)}`, 130, y);
    y += 7;
  }
  document.setFontSize(13);
  document.text(`Total: ${formatInvoiceAmount(invoice.total)}`, 130, y);
  if (invoice.notes) {
    y += 15;
    document.setFontSize(10);
    document.setTextColor(100);
    document.text(`Notes: ${invoice.notes}`, 20, y);
  }
  document.save(`${invoice.invoiceNumber}.pdf`);
}
