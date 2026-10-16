import { redirect } from "next/navigation";
import { requireSession } from "@/lib/rbac/require-permission";
import { recordLegacyRedirect } from "@/lib/observability/legacy-redirect";

export default async function KnowledgeRootPage() {
  await requireSession();
  recordLegacyRedirect("/knowledge", "/knowledge/chat");
  redirect("/knowledge/chat");
}
