import { OrgHierarchyListSkeleton } from "@/features/settings/organization/org-hierarchy-list-skeleton";

export default function TeamsLoading() {
  return (
    <OrgHierarchyListSkeleton
      title="Teams"
      subtitle="Teams within departments."
      columnCount={8}
      actionLabel="Add Team"
    />
  );
}
