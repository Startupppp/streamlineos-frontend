import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPlatformOwner } from "@/lib/platform/role";

export const dynamic = "force-dynamic";

/* Lightweight role-based router — NextAuth lands here after a successful
   credential or OAuth sign-in. We check the session role server-side and
   forward the user to the right home screen. */
export default async function PostSignInPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (isPlatformOwner(session.user.role)) redirect("/owner");
  redirect("/dashboard");
}
