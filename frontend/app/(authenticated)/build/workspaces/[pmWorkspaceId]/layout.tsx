import { type ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { getServerAuth } from "@/lib/get-server-auth";
import { BACKEND_URL } from "@/lib/backend-url";
import { withCorrelation } from "@/lib/observability/with-correlation";

interface PmWorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function PmWorkspaceLayout({
  children,
  params,
}: PmWorkspaceLayoutProps) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]");
  const { pmWorkspaceId } = await params;
  const session = await getServerAuth();
  const token = session?.backendJwt;

  if (!token) redirect("/build");

  const response = await fetch(
    `${BACKEND_URL}/build/workspaces/${pmWorkspaceId}`,
    {
      headers: withCorrelation(
        new Headers({ Authorization: `Bearer ${token}` }),
      ),
      cache: "no-store",
    },
  );

  if (response.status === 404) notFound();

  if (!response.ok) redirect("/build");

  return children;
}
