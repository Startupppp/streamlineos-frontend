import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { InboxPage } from "@/features/build/inbox/inbox-page";
import { prefetchBuildInbox } from "@/lib/prefetch/build-portfolio";
import InboxLoading from "./loading";

export default async function BuildInboxRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await enforceRouteAccess("/build/inbox");
  const params = await searchParams;
  if (params.view === "drafts") {
    const next = new URLSearchParams({ section: "drafts" });
    const q = params.q;
    if (typeof q === "string" && q.length <= 200) next.set("q", q);
    const projectId = params.projectId;
    if (typeof projectId === "string" && /^\d+$/.test(projectId)) {
      const parsed = Number(projectId);
      if (Number.isSafeInteger(parsed) && parsed > 0) next.set("projectId", String(parsed));
    }
    redirect(`/build/my-work?${next}`);
  }
  const state = await prefetchBuildInbox();
  return (
    <Suspense fallback={<InboxLoading />}>
      <HydrationBoundary state={state}>
        <InboxPage />
      </HydrationBoundary>
    </Suspense>
  );
}
