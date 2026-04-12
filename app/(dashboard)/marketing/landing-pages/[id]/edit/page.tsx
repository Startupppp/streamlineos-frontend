"use client";

import { use } from "react";
import { useCrmPage } from "@/lib/api/hooks/marketing";
import { PageBuilder } from "../../_components/page-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

type Props = { params: Promise<{ id: string }> };

export default function EditLandingPagePage({ params }: Props) {
  const { id: rawId } = use(params);
  const pid = Number(rawId);
  const { data: page, isLoading } = useCrmPage(pid > 0 ? pid : null);

  if (isLoading) {
    return (
      <PageWrapper title="Edit Landing Page" subtitle="Loading…">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!page) return null;

  return <PageBuilder page={page} />;
}
