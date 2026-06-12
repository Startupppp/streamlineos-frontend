import { Users, DollarSign, CreditCard } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface PayrollStatsProps {
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
}

export function PayrollStats({
  totalEmployees,
  totalGross,
  totalNet,
}: PayrollStatsProps) {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <StatCard
        label="Total Employees"
        value={totalEmployees}
        icon={Users}
        color="blue"
        index={0}
      />
      <StatCard
        label="Total Gross"
        value={fmt(totalGross)}
        icon={DollarSign}
        color="amber"
        index={1}
      />
      <StatCard
        label="Total Net Payout"
        value={fmt(totalNet)}
        icon={CreditCard}
        color="green"
        index={2}
      />
    </div>
  );
}
