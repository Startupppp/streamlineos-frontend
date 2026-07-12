import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

interface Payment {
  id: number;
  razorpayPaymentId: string | null;
  amount: string | number;
  paidAt: string | null;
  status: string;
}

const columns: DataTableColumn<Payment>[] = [
  {
    key: "paymentId",
    header: "Payment ID",
    className: "text-xs font-mono text-muted-foreground",
    cell: (row) => row.razorpayPaymentId ?? "—",
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-xs text-foreground",
    cell: (row) => `₹${Number(row.amount).toLocaleString("en-IN")}`,
  },
  {
    key: "date",
    header: "Date",
    className: "text-xs text-muted-foreground",
    cell: (row) =>
      row.paidAt
        ? new Date(row.paidAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant="secondary" className="text-[10px]">
        {row.status}
      </Badge>
    ),
  },
];

export function RecentPaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-[0.9375rem] font-semibold text-foreground">Recent Payments</h2>
      <DataTable
        data={payments}
        columns={columns}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}
