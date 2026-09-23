"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";

export function EmployeeDetailLoadError({
  supportCode,
}: {
  supportCode?: string;
}) {
  const router = useRouter();
  const handleRetry = useCallback(() => router.refresh(), [router]);
  const handleBack = useCallback(() => router.push("/hr/employees"), [router]);

  return (
    <PageWrapper
      leading={
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-9 shrink-0 gap-1.5 px-2.5 sm:h-8"
          onClick={handleBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      }
      title="Employee profile"
    >
      <ErrorState
        title="We couldn't open this profile"
        description={
          supportCode
            ? `This record didn't load. Try again — if it keeps happening, quote ${supportCode} to support.`
            : "This record didn't load. Try again — if it keeps happening, contact support."
        }
        onRetry={handleRetry}
      />
    </PageWrapper>
  );
}
