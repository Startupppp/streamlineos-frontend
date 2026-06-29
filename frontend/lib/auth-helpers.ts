import { auth } from "@/lib/auth";

interface AuthenticatedMember {
  userId: string;
  orgId: string;
  branchId: number | null;
  role: string | null;
  permissions: string[];
  enabledModules: string[];
  isPlatformAdmin: boolean;
  isOrgOwner: boolean;
}

interface AuthError {
  error: string;
}

export async function getAuthenticatedMember(): Promise<AuthenticatedMember | AuthError> {
  const session = await auth();
  if (!session?.user?.id || !session.orgId) {
    return { error: "Unauthorized" };
  }
  return {
    userId: session.user.id,
    orgId: session.orgId,
    branchId: session.branchId ?? null,
    role: session.user.role ?? null,
    permissions: session.permissions ?? [],
    enabledModules: session.enabledModules ?? [],
    isPlatformAdmin: session.user.isPlatformAdmin === true,
    isOrgOwner: session.user.isOrgOwner === true,
  };
}
