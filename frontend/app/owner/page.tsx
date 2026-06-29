import {
  Building2,
  Users as UsersIcon,
  Mail,
  TrendingUp,
  Eye,
  Wallet,
} from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { MetricCard } from "@/components/owner/metric-card";

export default function OwnerDashboard() {
  return (
    <div>
      <OwnerPage
        eyebrow="Platform overview"
        title="Welcome back."
        description="Everything across your StreamlineOS platform — customers, messages, leads, traffic, and revenue."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        <MetricCard
          label="Customers"
          value={0}
          hint="active last 30d"
          icon={<Building2 className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Users"
          value={0}
          hint="across all orgs"
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          accent="cyan"
        />
        <MetricCard
          label="Inbox"
          value={0}
          icon={<Mail className="h-3.5 w-3.5" />}
          accent="violet"
        />
        <MetricCard
          label="Leads"
          value={0}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          accent="emerald"
        />
        <MetricCard
          label="Visits (30d)"
          value={0}
          icon={<Eye className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Revenue (30d)"
          value="₹0"
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent="emerald"
        />
      </div>
    </div>
  );
}
