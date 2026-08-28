import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { CommentDraftsPage } from "@/features/build/drafts/comment-drafts-page";

export default async function ProjectDraftsPage() {
  await enforceRouteAccess("/build/drafts");
  return <CommentDraftsPage />;
}
