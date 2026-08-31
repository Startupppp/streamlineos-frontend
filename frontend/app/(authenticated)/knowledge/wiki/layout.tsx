import { Suspense } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import WikiShell from "@/features/wiki/components/wiki-shell";

export default async function KnowledgeWikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await enforceRouteAccess("/knowledge/wiki");
  return (
    <Suspense>
      <WikiShell>{children}</WikiShell>
    </Suspense>
  );
}
