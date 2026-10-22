import { ManagerHomeSkeleton } from "@/features/me/team/manager-home-page";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function MyTeamLoading() {
  return (
    <PageWrapper title="My team" noInternalScroll contentClassName="flex min-h-0 flex-1 flex-col">
      <ManagerHomeSkeleton />
    </PageWrapper>
  );
}
