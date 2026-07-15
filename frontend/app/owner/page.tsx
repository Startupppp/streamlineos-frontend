import {
  Building2,
  Users as UsersIcon,
  Mail,
  TrendingUp,
  Eye,
  Wallet,
} from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

export default function OwnerDashboard() {
  return (
    <div>
      <OwnerPage
        title="Welcome back."
        description="Everything across your StreamlineOS platform — customers, messages, leads, traffic, and revenue."
      />

      <StatCardGrid cols={6}>
        <StatCard label="Customers" value={0} hint="active last 30d" icon={Building2} tone="blue" />
        <StatCard label="Users" value={0} hint="across all orgs" icon={UsersIcon} color="cyan" />
        <StatCard label="Inbox" value={0} icon={Mail} tone="violet" />
        <StatCard label="Leads" value={0} icon={TrendingUp} tone="emerald" />
        <StatCard label="Visits (30d)" value={0} icon={Eye} tone="blue" />
        <StatCard label="Revenue (30d)" value="₹0" icon={Wallet} tone="emerald" />
      </StatCardGrid>
    </div>
  );
}
