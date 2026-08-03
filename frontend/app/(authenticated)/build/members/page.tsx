import { Suspense } from "react";
import { MembersPage } from "@/features/build/members/members-page";
import { DataTableSkeleton } from "@/components/ui/data-table";

export const metadata = {
  title: "Members",
};

export default function ProjectsMembersPage() {
  return (
    <Suspense fallback={<DataTableSkeleton rows={10} columns={5} className="m-6" />}>
      <MembersPage />
    </Suspense>
  );
}
