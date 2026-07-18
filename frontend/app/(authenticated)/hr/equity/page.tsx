"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { EquityGrantSheet } from "@/features/hr/enterprise/comp/equity-grant-sheet";
import { VestingTimeline } from "@/features/hr/enterprise/comp/vesting-timeline";
import { ExerciseDialog } from "@/features/hr/enterprise/comp/exercise-dialog";
import { useEquityGrants, type EquityGrant } from "@/hooks/api/hr/enterprise-comp";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  exercised: "outline",
  cancelled: "destructive",
  expired: "secondary",
};

export default function EquityPage() {
  const canManage = useCan("hr:equity:manage");
  const [grantSheetOpen, setGrantSheetOpen] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<EquityGrant | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);

  const { data, isLoading } = useEquityGrants();
  const { data: membersData } = useOrgMembers(1, 200);
  const grants = data?.data ?? [];

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = (userId: string) => {
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : userId;
  };

  const grantColumns = useMemo(() => [
    { key: "employee", header: "Employee", cell: (r: EquityGrant) => <span className="font-medium text-sm">{resolveMemberName(r.userId)}</span> },
    { key: "type", header: "Type", cell: (r: EquityGrant) => <Badge variant="secondary">{r.grantType}</Badge> },
    { key: "units", header: "Units", cell: (r: EquityGrant) => r.units.toLocaleString() },
    { key: "date", header: "Grant Date", cell: (r: EquityGrant) => format(new Date(r.grantDate), "dd MMM yyyy") },
    { key: "cliff", header: "Cliff", cell: (r: EquityGrant) => `${r.cliffMonths}m` },
    { key: "vesting", header: "Vesting", cell: (r: EquityGrant) => `${r.vestingMonths}m` },
    {
      key: "status",
      header: "Status",
      cell: (r: EquityGrant) => <Badge variant={STATUS_VARIANT[r.status]} className="capitalize text-[11px]">{r.status}</Badge>,
    },
    {
      key: "board",
      header: "Board Approved",
      cell: (r: EquityGrant) => r.boardApprovedAt ? (
        <span className="text-xs text-emerald-600 dark:text-emerald-300">✓ {format(new Date(r.boardApprovedAt), "dd MMM yyyy")}</span>
      ) : (
        <span className="text-xs text-muted-foreground">Pending</span>
      ),
    },
  ], [memberById]);

  return (
    <PageWrapper
      title="Equity & ESOP"
      subtitle="Manage equity grants, vesting schedules, and exercises"
      actions={
        canManage ? (
          <Button onClick={() => setGrantSheetOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            New Grant
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className={selectedGrant ? "lg:col-span-3" : "lg:col-span-5"}>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : !grants.length ? (
              <EmptyState
                illustrationPreset="default"
                title="No equity grants"
                description="Create ESOP, ISO, NSO, or RSU grants for employees"
                action={canManage ? { label: "New Grant", onClick: () => setGrantSheetOpen(true) } : undefined}
                className="h-64"
                compact
              />
            ) : (
              <DataTable
                getRowKey={(r) => r.id}
                onRowClick={setSelectedGrant}
                data={grants}
                columns={grantColumns}
              />
            )}
          </div>

          {selectedGrant && (
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">Grant #{selectedGrant.id}</p>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedGrant(null)}>✕</Button>
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{selectedGrant.grantType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Units</span><span className="font-medium">{selectedGrant.units.toLocaleString()}</span></div>
                  {selectedGrant.strikePriceCents && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Strike Price</span><span className="font-medium">${(selectedGrant.strikePriceCents / 100).toFixed(2)}</span></div>
                  )}
                </div>

                {canManage && selectedGrant.status === "active" && (
                  <Button onClick={() => setExerciseOpen(true)} variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                    Record Exercise
                  </Button>
                )}
              </div>

              <div className="p-4 rounded-xl border bg-card">
                <p className="font-semibold text-sm mb-3">Vesting Schedule</p>
                <VestingTimeline grantId={selectedGrant.id} />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <EquityGrantSheet open={grantSheetOpen} onOpenChange={setGrantSheetOpen} />
      {selectedGrant && (
        <ExerciseDialog open={exerciseOpen} onOpenChange={setExerciseOpen} grantId={selectedGrant.id} />
      )}
    </PageWrapper>
  );
}
