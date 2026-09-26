"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type AccessSection = "members" | "access";

function isAccessSection(v: string): v is AccessSection {
  return v === "members" || v === "access";
}

interface BuildAccessShellProps {
  membersContent: ReactNode;
  accessContent: ReactNode;
}

export function BuildAccessShell({
  membersContent,
  accessContent,
}: BuildAccessShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get("section") ?? "members";
  const activeSection: AccessSection = isAccessSection(raw) ? raw : "members";

  const handleSectionChange = useCallback(
    (value: string) => {
      if (!isAccessSection(value)) return;
      const params = new URLSearchParams(searchParams.toString());
      if (value === "members") {
        params.delete("section");
      } else {
        params.set("section", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <Tabs
      value={activeSection}
      onValueChange={handleSectionChange}
      className="flex flex-col"
    >
      <div className="shrink-0 px-6 pt-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="access">Access control</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="members" className="mt-0 flex min-h-0 flex-1 flex-col">
        {activeSection === "members" ? membersContent : null}
      </TabsContent>
      <TabsContent value="access" className="mt-0 flex min-h-0 flex-1 flex-col">
        {activeSection === "access" ? accessContent : null}
      </TabsContent>
    </Tabs>
  );
}
