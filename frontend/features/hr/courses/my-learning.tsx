"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useMyEnrollments } from "@/hooks/api/hr/courses";
import type { CourseEnrollment } from "@/hooks/api/hr/courses";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_CONFIG: Record<CourseEnrollment["status"], { label: string; className: string }> = {
  ENROLLED: { label: "Enrolled", className: "bg-primary/5 text-foreground border-primary/30" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  DROPPED: { label: "Dropped", className: "bg-muted text-muted-foreground border-border" },
};

function EnrollmentSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function MyLearning() {
  const { data: enrollments = [], isLoading } = useMyEnrollments();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <EnrollmentSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        illustrationPreset="default"
        title="No courses yet"
        description="Enroll in a course from the catalog to get started"
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AnimatePresence>
        {enrollments.map((enrollment, idx) => {
          const config = STATUS_CONFIG[enrollment.status];
          const progress = parseFloat(enrollment.progressPct);

          return (
            <motion.div
              key={enrollment.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.06 }}
              className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-50 shrink-0 dark:bg-blue-500/10">
                    {enrollment.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <TruncatedText text={`Course #${enrollment.courseId}`} className="text-sm font-medium text-foreground" />
                    {enrollment.completedAt && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        Completed {new Date(enrollment.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={`text-[10px] px-2 py-0.5 shrink-0 border ${config.className}`}>
                  {config.label}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Progress</span>
                  <span className="text-[11px] font-medium tabular-nums">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
