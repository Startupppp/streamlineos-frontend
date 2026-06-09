import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPlatformOwner } from "./role";

/* Guard helper used by every server component / server action inside the
   /owner route group. Forces a redirect when the caller is not the platform
   owner — guarantees ownership at the server boundary, not the UI. */
export async function requirePlatformOwner() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/owner");
  }
  if (!isPlatformOwner(session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}
