import { requirePermission } from "@/lib/rbac/require-permission";
import { BlogAdminPage } from "@/features/blog/admin/blog-admin-page";

export const metadata = { title: "Blog Admin" };

export default async function BlogAdminRoute() {
  await requirePermission("blog:posts:manage");
  return <BlogAdminPage />;
}
