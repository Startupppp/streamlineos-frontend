import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await enforceRouteAccess("/knowledge");
  return children;
}
