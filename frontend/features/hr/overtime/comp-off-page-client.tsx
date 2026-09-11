"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import Link from "next/link";
import { useCompOff } from "@/hooks/api/hr/comp-off";
import { getErrorMessage } from "@/lib/get-error-message";

export function CompOffPageClient() {
  const { data: records, isLoading, isError, error, refetch } = useCompOff();
  const earnedDays = records?.[0] ? parseFloat(records[0].earnedDays) : 0;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper title="Compensatory Off" subtitle="Track earned comp-off from overtime work">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load comp-off balance"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            {isLoading ? (
              <Skeleton className="h-40 rounded-2xl" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="bg-primary rounded-2xl p-6 text-primary-foreground shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-foreground/70 text-sm font-medium">Available Comp-Off Balance</p>
                    <p className="text-5xl font-bold mt-1">{earnedDays.toFixed(1)}</p>
                    <p className="text-primary-foreground/70 text-sm mt-1">days earned</p>
                  </div>
                  <div className="flex size-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-sm">
                    <IllustrationImage name="empty-leave" className="size-full" alt="" />
                  </div>
                </div>
                {earnedDays > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/20 flex justify-end">
                    <Button asChild variant="secondary" className="bg-background text-foreground hover:bg-background/90 font-semibold">
                      <Link href="/hr/leaves">
                        Apply Leave <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {!isLoading && earnedDays === 0 && (
              <EmptyState
                illustrationPreset="calendar"
                illustrationSize="md"
                title="No comp-off balance"
                description="Work overtime on a holiday or weekend to earn compensatory off days."
                className="py-12"
              />
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
