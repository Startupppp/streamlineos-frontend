import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata = { title: "Blog Admin", robots: { index: false, follow: false } };

/**
 * Editorial work moved to the standalone blog admin (Startupppp/blogs), which writes the same
 * published content this site serves. BLOG_ADMIN_URL is that deployment's origin.
 */
export default async function BlogAdminRoute() {
  await requirePermission("blog:posts:manage");
  const adminUrl = process.env.BLOG_ADMIN_URL;
  if (adminUrl && /^https?:\/\//.test(adminUrl)) redirect(adminUrl);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">The blog editor has moved</h1>
      <p className="mt-3 text-muted-foreground">Articles are now written and published in the separate Journal CMS. Ask your publication administrator for its address and your access.</p>
    </div>
  );
}
