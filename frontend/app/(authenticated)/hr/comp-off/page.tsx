"use client";

import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useCompOff } from "@/hooks/api/hr/comp-off";

export default function CompOffPage() {
  const { data: records, isLoading } = useCompOff();

  const earnedDays = records?.[0] ? parseFloat(records[0].earnedDays) : 0;

  return (
    <PageWrapper title="Compensatory Off" subtitle="Track earned comp-off from overtime work" variant="display">
      <div className="space-y-6">
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
              <div className="bg-white/20 rounded-2xl p-4">
                <Clock className="h-10 w-10 text-primary-foreground" />
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.08 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="bg-muted rounded-2xl p-5 mb-4">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No comp-off balance</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Work overtime on a holiday or weekend to earn compensatory off days.
            </p>
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
