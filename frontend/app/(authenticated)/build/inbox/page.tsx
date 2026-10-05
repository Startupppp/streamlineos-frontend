import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { InboxPage } from "@/features/build/inbox/inbox-page";

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
  return <InboxPage />;
}
