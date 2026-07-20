import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import { isPlatformOwner } from "./role";

export async function requirePlatformOwner() {
  const session = await getServerAuth();

  if (!session?.user?.id) redirect(signInPathForMissingSession("/owner"));

  const isPlatformAdmin =
    session.user.isPlatformAdmin === true || isPlatformOwner(session.user.role);

  if (!isPlatformAdmin) redirect("/dashboard");

  return session;
}
