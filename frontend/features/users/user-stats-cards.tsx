"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStats } from "@/hooks/api/users";
import { Users, UserCheck, UserX, Mail } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  isLoading: boolean;
}

function StatCard({ label, value, icon, isLoading }: StatCardProps) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
        {isLoading ? (
          <Skeleton className="h-6 w-12 mt-0.5" />
        ) : (
          <p className="text-xl font-semibold leading-tight tabular-nums">{value ?? 0}</p>
        )}
      </div>
    </Card>
  );
}

export function UserStatsCards() {
  const { data, isLoading } = useUserStats();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Total"
        value={data?.total}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <StatCard
        label="Active"
        value={data?.active}
        icon={<UserCheck className="h-4 w-4 text-green-600" />}
        isLoading={isLoading}
      />
      <StatCard
        label="Suspended"
        value={data?.suspended}
        icon={<UserX className="h-4 w-4 text-yellow-600" />}
        isLoading={isLoading}
      />
      <StatCard
        label="Pending Invites"
        value={data?.pendingInvitations}
        icon={<Mail className="h-4 w-4 text-blue-500" />}
        isLoading={isLoading}
      />
    </div>
  );
}
