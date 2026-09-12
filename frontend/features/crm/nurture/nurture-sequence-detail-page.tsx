"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { useCan, useCanState } from "@/hooks/api/access";
import { useNurtureSequence } from "@/hooks/api/crm/nurture";
import { getErrorMessage } from "@/lib/get-error-message";
import { NurtureEnrollmentsPanel } from "./nurture-enrollments-panel";
import { NurtureSequenceActions } from "./nurture-sequence-actions";
import { NurtureSequenceStatusBadge } from "./nurture-status-badge";
import { NurtureStepEditor } from "./nurture-step-editor";

const TABS = ["cadence", "enrolled"] as const;
type NurtureTab = (typeof TABS)[number];

function isTab(value: string | null): value is NurtureTab {
  return value !== null && TABS.some((tab) => tab === value);
}

interface NurtureSequenceDetailPageProps {
  nurtureSequenceId: string;
}

/**
 * One cadence: what it does, and who it is doing it to.
 *
 * The two tabs are deliberately not one scroll. Editing the cadence changes
 * what happens to everybody already inside it, and a screen that put the step
 * fields directly above the list of enrolled customers would invite editing the
 * first without reading the second.
 */
export function NurtureSequenceDetailPage({
  nurtureSequenceId,
}: NurtureSequenceDetailPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewState = useCanState("crm:autonomy:view");
  const canManage = useCan("crm:autonomy:manage");
  const detail = useNurtureSequence(nurtureSequenceId);

  const tabParam = searchParams.get("tab");
  const tab: NurtureTab = isTab(tabParam) ? tabParam : "cadence";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (viewState === "denied")
    return (
      <PageWrapper title="Nurture sequence" backHref="/crm/autonomy/nurture">
        <NoPermissionState
          permission="crm:autonomy:view"
          description="You don’t have permission to read the nurture cadences."
        />
      </PageWrapper>
    );

  if (detail.isError)
    return (
      <PageWrapper title="Nurture sequence" backHref="/crm/autonomy/nurture">
        <ErrorState
          className="flex-1"
          title="Couldn’t load this sequence"
          description={getErrorMessage(detail.error)}
          onRetry={() => void detail.refetch()}
        />
      </PageWrapper>
    );

  if (!detail.data)
    return (
      <PageWrapper title="Nurture sequence" backHref="/crm/autonomy/nurture">
        <div className="flex flex-1 flex-col gap-gap-field" aria-busy="true">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </PageWrapper>
    );

  const { sequence, steps } = detail.data;

  return (
    <PageWrapper
      title={sequence.name}
      subtitle={sequence.description ?? "No description."}
      backHref="/crm/autonomy/nurture"
      backLabel="Back to nurture sequences"
      badge={<NurtureSequenceStatusBadge status={sequence.status} />}
      actions={canManage ? <NurtureSequenceActions sequence={sequence} /> : null}
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="cadence">Cadence</TabsTrigger>
          <TabsTrigger value="enrolled">Who’s enrolled</TabsTrigger>
        </TabsList>

        <TabsContent value="cadence" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <NurtureStepEditor
            nurtureSequenceId={sequence.nurtureSequenceId}
            steps={steps}
            status={sequence.status}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="enrolled" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <NurtureEnrollmentsPanel
            nurtureSequenceId={sequence.nurtureSequenceId}
            sequenceStatus={sequence.status}
            stepCount={steps.length}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
