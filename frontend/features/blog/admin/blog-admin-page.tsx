"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCan } from "@/hooks/api/access";
import { BlogAdminPosts } from "./blog-admin-posts";
import { BlogAdminCategories } from "./blog-admin-categories";

type AdminTab = "posts" | "categories";

export function BlogAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canManagePosts = useCan("blog:posts:manage");
  const canManageCategories = useCan("blog:categories:manage");

  const rawTab = searchParams.get("tab");
  const tab: AdminTab =
    rawTab === "categories" ? "categories" : "posts";

  function handleTabChange(value: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", value);
    p.delete("page");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  if (!canManagePosts && !canManageCategories)
    return <NoPermissionState permission="blog:posts:manage" />;

  return (
    <PageWrapper
      title="Blog admin"
      subtitle="Manage posts and categories for the public blog."
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="shrink-0">
          {canManagePosts && <TabsTrigger value="posts">Posts</TabsTrigger>}
          {canManageCategories && <TabsTrigger value="categories">Categories</TabsTrigger>}
        </TabsList>

        {canManagePosts && (
          <TabsContent value="posts" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <div className="flex flex-1 min-h-0 flex-col pt-3">
              <BlogAdminPosts />
            </div>
          </TabsContent>
        )}

        {canManageCategories && (
          <TabsContent value="categories" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <div className="flex flex-1 min-h-0 flex-col pt-3">
              <BlogAdminCategories />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </PageWrapper>
  );
}
