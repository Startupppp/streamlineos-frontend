"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Plus, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlogAdminNavProps {
  userName: string;
}

export function BlogAdminNav({ userName }: BlogAdminNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/blogs/admin", label: "Posts", active: pathname === "/blogs/admin" || pathname.startsWith("/blogs/admin/") && !pathname.startsWith("/blogs/admin/categories") },
    { href: "/blogs/admin/categories", label: "Categories", active: pathname.startsWith("/blogs/admin/categories") },
  ];

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/blogs/admin" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PenLine className="size-4" />
            </span>
            Blog CMS
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  l.active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/blogs" target="_blank">
              <ExternalLink className="size-4" /> View blog
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/blogs/admin/new">
              <Plus className="size-4" /> New post
            </Link>
          </Button>
          <span className="hidden text-sm text-muted-foreground md:inline">{userName}</span>
          <Button asChild variant="ghost" size="icon-sm" title="Sign out">
            <Link href="/api/auth/signout">
              <LogOut className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
