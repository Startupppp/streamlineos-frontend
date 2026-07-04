import { requirePermission } from "@/lib/rbac/require-permission";
import { BankTransfersContent } from "./bank-transfers-content";

export const metadata = { title: "Bank Transfers — Payroll" };

export default async function BankTransfersPage() {
  await requirePermission("payroll:bank:manage");
  return <BankTransfersContent />;
}
