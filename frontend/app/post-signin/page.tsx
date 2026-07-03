import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPlatformOwner, OWNER_HOME } from "@/lib/platform/role";
import { ROLES } from "@/lib/constants/roles";

export const dynamic = "force-dynamic";

/* Lightweight role-based router — NextAuth lands here after a successful
   credential or OAuth sign-in. Mirrors middleware's onboarding/org-setup gates
   so we redirect straight to the right screen instead of bouncing through
   /dashboard first. Middleware remains the enforcement layer (this page is UX
   only, per CLAUDE.md §17 "Middleware — NOT for authorization"). */
export default async function PostSignInPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (isPlatformOwner(session.user.role) || session.user.isPlatformAdmin) {
    redirect(OWNER_HOME);
  }
  if (session.orgId == null) redirect("/org-setup");

  const isOrgOwner = session.user.isOrgOwner === true || session.user.role === ROLES.OWNER;
  if (isOrgOwner) {
    redirect(session.orgOnboardingCompletedAt ? "/dashboard" : "/org-setup");
  }
  redirect(session.userOnboardingCompletedAt ? "/dashboard" : "/onboarding");
}
