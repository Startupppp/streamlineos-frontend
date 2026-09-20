"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import {
  useLeavePolicies,
  useDeleteLeavePolicy,
  type LeavePolicy,
} from "@/hooks/api/hr/leave-policies";
import { useLeaveTypesAdmin } from "@/hooks/api/hr/leaves";
import { LeaveTypesManager } from "@/features/hr/leaves/leave-types-manager";
import { PolicyCard } from "@/features/hr/leave-policies/policy-card";
import { PolicyFormSheet } from "@/features/hr/leave-policies/policy-form-sheet";

function LeavePoliciesEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 flex flex-col"
    >
      <UiEmptyState
        illustrationPreset="calendar"
        title="No leave policies yet"
        description="Define accrual rules and carry-forward policies for each leave type."
        action={{ label: "Create Policy", onClick: onCreateClick }}
      />
    </motion.div>
  );
}

export function LeavePoliciesPage() {
  const { data: policies, isLoading, isError, error, refetch } = useLeavePolicies();
  const { data: leaveTypesData } = useLeaveTypesAdmin();
  const leaveTypeOptions = leaveTypesData ?? [];
  const deleteMutation = useDeleteLeavePolicy();
  const canManage = useCan("hr:leaves:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);

  const handleCreateClick = useCallback(() => {
    setEditingPolicy(null);
    setSheetOpen(true);
  }, []);

  const handleEditClick = useCallback((policy: LeavePolicy) => {
    setEditingPolicy(policy);
    setSheetOpen(true);
  }, []);

  const handleDeleteClick = useCallback(
    (id: number) => {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Policy deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteMutation],
  );

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open);
      if (!open) setEditingPolicy(null);
    },
    [],
  );

  const handleCreated = useCallback(() => {
    setEditingPolicy(null);
  }, []);

  return (
    <PageWrapper
      title="Leave Policies"
      subtitle="Define accrual and carry-forward rules per leave type"
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            size="sm"
            iconSize={16}
            onClick={handleCreateClick}
          >
            {" New Policy"}
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="mb-4">
        <LeaveTypesManager canManage={canManage} />
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load leave policies"
          description={getErrorMessage(error)}
          onRetry={refetch}
        />
      ) : !policies?.length ? (
        <LeavePoliciesEmptyState onCreateClick={handleCreateClick} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policies.map((policy, i) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              index={i}
              canManage={canManage}
              leaveTypeName={
                leaveTypeOptions.find((t) => t.id === policy.leaveTypeId)?.name
              }
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <PolicyFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editingPolicy={editingPolicy}
        onCreated={handleCreated}
      />
    </PageWrapper>
  );
}
