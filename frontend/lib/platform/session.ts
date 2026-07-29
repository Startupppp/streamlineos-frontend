import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";

export async function requirePlatformOwner() {
  const session = await getServerAuth();

  if (!session?.user?.id) redirect(signInPathForMissingSession("/owner"));

  if (!session.user.isPlatformAdmin) redirect("/dashboard");

  return session;
}
