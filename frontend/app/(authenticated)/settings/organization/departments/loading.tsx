import { OrgHierarchyListSkeleton } from "@/features/settings/organization/org-hierarchy-list-skeleton";

export default function DepartmentsLoading() {
  return (
    <OrgHierarchyListSkeleton
      title="Departments"
      subtitle="Departments organized within branches."
      columnCount={7}
      actionLabel="Add Department"
    />
  );
}
