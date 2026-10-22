import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { prefetchHrAnnouncements } from "@/lib/prefetch/hr-talent";
import { AnnouncementsAdminPage } from "@/features/hr/announcements/announcements-admin-page";
import AnnouncementsLoading from "./loading";

async function AnnouncementsHydrated() {
  const state = await prefetchHrAnnouncements();
  return (
    <HydrationBoundary state={state}>
      <AnnouncementsAdminPage />
    </HydrationBoundary>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<AnnouncementsLoading />}>
      <AnnouncementsHydrated />
    </Suspense>
  );
}
