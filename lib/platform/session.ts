import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isPlatformOwner } from "./role";

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
