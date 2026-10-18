import { OrgHierarchyListSkeleton } from "@/features/settings/organization/org-hierarchy-list-skeleton";

export default function LocationsLoading() {
  return (
    <OrgHierarchyListSkeleton
      title="Locations"
      subtitle="Physical work locations and offices."
      columnCount={5}
      actionLabel="Add Location"
    />
  );
}
