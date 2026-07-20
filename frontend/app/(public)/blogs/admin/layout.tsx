import { redirect } from "next/navigation";
import { getSessionAbility } from "@/lib/abilities-server";
import { BlogAdminNav } from "@/components/blog/blog-admin-nav";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";

export const dynamic = "force-dynamic";

export default async function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuth();
  if (!session?.user) {
    redirect(signInPathForMissingSession("/blogs/admin"));
  }
  const ability = await getSessionAbility();
  if (!ability.can("manage", "blog:posts")) {
    redirect("/blogs");
  }

  return (
    <div className="min-h-dvh bg-background">
      <BlogAdminNav userName={session.user.name ?? session.user.email ?? "Editor"} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
