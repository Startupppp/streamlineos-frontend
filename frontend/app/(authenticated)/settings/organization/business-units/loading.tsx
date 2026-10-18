import { OrgHierarchyListSkeleton } from "@/features/settings/organization/org-hierarchy-list-skeleton";

export default function BusinessUnitsLoading() {
  return (
    <OrgHierarchyListSkeleton
      title="Business Units"
      subtitle="Top-level divisions of your organization."
      columnCount={5}
      actionLabel="Add Business Unit"
    />
  );
}
