import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlogAdminTable } from "@/components/blog/blog-admin-table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage posts" };

export default function AdminPostsPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and publish blog posts.
          </p>
        </div>
        <Button asChild>
          <Link href="/blogs/admin/new">
            <Plus className="size-4" /> New post
          </Link>
        </Button>
      </div>
      <BlogAdminTable />
    </div>
  );
}
