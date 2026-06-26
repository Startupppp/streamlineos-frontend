import type { Metadata } from "next";
import { CategoriesManager } from "@/components/blog/categories-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Categories</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Organize posts into colored categories.
      </p>
      <CategoriesManager />
    </div>
  );
}
