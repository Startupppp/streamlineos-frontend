import { OrgHierarchyListSkeleton } from "@/features/settings/organization/org-hierarchy-list-skeleton";

export default function BranchesLoading() {
  return (
    <OrgHierarchyListSkeleton
      title="Branches"
      subtitle="Branches within your organization."
      columnCount={9}
      actionLabel="Add Branch"
    />
  );
}
