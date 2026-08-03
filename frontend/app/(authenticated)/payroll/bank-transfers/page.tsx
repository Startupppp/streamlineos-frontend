import { requirePermission } from "@/lib/rbac/require-permission";
import { BankTransfersContent } from "@/features/payroll/bank-transfers/bank-transfers-content";

export const metadata = { title: "Bank Transfers — Payroll" };

export default async function BankTransfersPage() {
  await requirePermission("payroll:bank:manage");
  return <BankTransfersContent />;
}
