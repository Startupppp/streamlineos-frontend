import { OrgHierarchyListSkeleton } from "@/features/settings/organization/org-hierarchy-list-skeleton";

export default function CostCentersLoading() {
  return (
    <OrgHierarchyListSkeleton
      title="Cost Centers"
      subtitle="Classify payroll, budgets, and expenses for reporting."
      columnCount={5}
      actionLabel="Add Cost Center"
    />
  );
}
