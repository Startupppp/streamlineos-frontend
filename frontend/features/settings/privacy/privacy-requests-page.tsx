"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Inbox } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { useCanState } from "@/hooks/api/access";
import { PersonDataPanel } from "./person-data-panel";
import { SubjectRequestsPanel } from "./subject-requests-panel";
import { resolvePrivacyTab, type PrivacyTab } from "./privacy-tabs";

export function PrivacyRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const retention = useCanState("hr:retention:manage");
  const compliance = useCanState("compliance:subject-requests:view");

  const showMember = retention !== "denied";
  const showRequests = compliance !== "denied";

  const availableTabs = useMemo(() => {
    const tabs: PrivacyTab[] = [];
    if (showMember) tabs.push("member");
    if (showRequests) tabs.push("requests");
    return tabs;
  }, [showMember, showRequests]);

  const activeTab = resolvePrivacyTab(searchParams.get("tab"), availableTabs);
  const showTabs = availableTabs.length > 1;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === availableTabs[0]) params.delete("tab");
      else params.set("tab", value);
      const suffix = params.toString();
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    },
    [availableTabs, pathname, router, searchParams],
  );

  return (
    <PageWrapper
      title="Privacy Requests"
      subtitle="Handle member data exports, erasures, and filed subject-access requests."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      {!showMember && !showRequests ? null : showTabs ? (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden"
        >
          <TabsList className="mb-3 shrink-0 sm:mb-4">
            <TabsTrigger value="member">
              <Download className="h-3.5 w-3.5 max-sm:hidden" aria-hidden="true" />
              Member data
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Inbox className="h-3.5 w-3.5 max-sm:hidden" aria-hidden="true" />
              Subject requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="member" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <PersonDataPanel />
          </TabsContent>
          <TabsContent value="requests" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <SubjectRequestsPanel />
          </TabsContent>
        </Tabs>
      ) : showMember ? (
        <PersonDataPanel />
      ) : (
        <SubjectRequestsPanel />
      )}
    </PageWrapper>
  );
}
