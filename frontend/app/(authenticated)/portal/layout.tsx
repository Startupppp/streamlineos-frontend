import type { Metadata } from "next";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export const metadata: Metadata = {
  title: "Client portal | StreamlineOS",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await enforceRouteAccess("/portal");
  return children;
}
