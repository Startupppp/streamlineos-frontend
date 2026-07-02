import { Badge } from "@/components/ui/badge";

interface Payment {
  id: number;
  razorpayPaymentId: string | null;
  amount: string | number;
  paidAt: string | null;
  status: string;
}

export function RecentPaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-[0.9375rem] font-semibold text-foreground">Recent Payments</h2>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Payment ID</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                  {payment.razorpayPaymentId ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-foreground">
                  ₹{Number(payment.amount).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {payment.paidAt
                    ? new Date(payment.paidAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {payment.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
