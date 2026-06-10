import { BlogSiteHeader } from "@/components/blog/blog-site-header";
import { BlogFooter } from "@/components/blog/blog-footer";

export default function BlogSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <BlogSiteHeader />
      <main className="flex-1">{children}</main>
      <BlogFooter />
    </div>
  );
}
