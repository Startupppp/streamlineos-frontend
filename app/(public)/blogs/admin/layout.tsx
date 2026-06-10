import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BLOG_ADMIN_ROLES } from "@/lib/constants/roles";
import { BlogAdminNav } from "@/components/blog/blog-admin-nav";

export const dynamic = "force-dynamic";

export default async function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/blogs/admin");
  }
  if (!BLOG_ADMIN_ROLES.includes(session.user.role ?? "")) {
    redirect("/blogs");
  }

  return (
    <div className="min-h-screen bg-background">
      <BlogAdminNav userName={session.user.name ?? session.user.email ?? "Editor"} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
