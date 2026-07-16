"use client";

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const EnrollmentStatusChart = dynamic(
  () => import("@/features/hr/learning/components/enrollment-status-chart").then((m) => ({ default: m.EnrollmentStatusChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-lg" /> },
);
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useCourses, useMyEnrollments } from "@/hooks/api/hr/courses";
import { useTrainingPrograms } from "@/hooks/api/hr/training";

interface Course {
  id: number;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isMandatory: boolean;
  tags: string[];
  categoryId?: number;
}

interface CourseEnrollment {
  id: number;
  courseId: number;
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";
  progressPct: string;
  completedAt?: string;
}

type EnrollmentStatus = CourseEnrollment["status"];


interface StatusBarDatum {
  status: string;
  count: number;
}

interface TopCourse {
  courseId: number;
  title: string;
  count: number;
}

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ENROLLED: "Enrolled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
};

const STATUSES: EnrollmentStatus[] = [
  "ENROLLED",
  "IN_PROGRESS",
  "COMPLETED",
  "DROPPED",
];

function ChartSkeleton() {
  return (
    <Card className="bg-card border border-border rounded-lg shadow-sm">
      <CardContent className="p-4">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

function TopCoursesSkeleton() {
  return (
    <Card className="bg-card border border-border rounded-lg shadow-sm">
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-5 w-8 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function LearningAnalyticsPage() {
  const {
    data: courses,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
    refetch: refetchCourses,
  } = useCourses();

  const {
    data: enrollments,
    isLoading: isEnrollmentsLoading,
    isError: isEnrollmentsError,
    refetch: refetchEnrollments,
  } = useMyEnrollments();

  const {
    isLoading: isTrainingLoading,
  } = useTrainingPrograms();

  const isLoading = isCoursesLoading || isEnrollmentsLoading || isTrainingLoading;
  const isError = isCoursesError || isEnrollmentsError;

  const handleRetry = useCallback(() => {
    void refetchCourses();
    void refetchEnrollments();
  }, [refetchCourses, refetchEnrollments]);

  const publishedCount = useMemo(
    () => (courses ?? []).filter((c: Course) => c.status === "PUBLISHED").length,
    [courses],
  );

  const totalEnrolled = useMemo(() => (enrollments ?? []).length, [enrollments]);

  const avgCompletion = useMemo(() => {
    const list = enrollments ?? [];
    if (list.length === 0) return "0.0";
    const sum = list.reduce((acc: number, e: CourseEnrollment) => acc + parseFloat(e.progressPct), 0);
    return (sum / list.length).toFixed(1);
  }, [enrollments]);

  const completedCount = useMemo(
    () => (enrollments ?? []).filter((e: CourseEnrollment) => e.status === "COMPLETED").length,
    [enrollments],
  );

  const kpis = useMemo(
    () => [
      { label: "Total Courses", value: publishedCount, icon: BookOpen, tone: "default" as const },
      { label: "Total Enrolled", value: totalEnrolled, icon: Users, tone: "blue" as const },
      { label: "Avg Completion", value: `${avgCompletion}%`, icon: TrendingUp, tone: "amber" as const },
      { label: "Completed", value: completedCount, icon: CheckCircle2, tone: "emerald" as const },
    ],
    [publishedCount, totalEnrolled, avgCompletion, completedCount],
  );

  const statusBarData: StatusBarDatum[] = useMemo(() => {
    const list = enrollments ?? [];
    return STATUSES.map((s) => ({
      status: STATUS_LABELS[s],
      count: list.filter((e: CourseEnrollment) => e.status === s).length,
    }));
  }, [enrollments]);

  const topCourses: TopCourse[] = useMemo(() => {
    const list = enrollments ?? [];
    const courseList = courses ?? [];
    const countMap = new Map<number, number>();
    for (const e of list) {
      countMap.set(e.courseId, (countMap.get(e.courseId) ?? 0) + 1);
    }
    return Array.from(countMap.entries())
      .map(([courseId, count]) => {
        const course = courseList.find((c: Course) => c.id === courseId);
        return { courseId, title: course?.title ?? `Course #${courseId}`, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [enrollments, courses]);

  if (isError) {
    return (
      <PageWrapper
        title="Learning Analytics"
        subtitle="Track your learning progress and course completion"
      >
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load analytics"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Learning Analytics"
      subtitle="Track your learning progress and course completion"
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/hr/analytics">
            See Full HR Analytics
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        {isLoading ? (
          <StatCardGridSkeleton cols={4} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <StatCardGrid cols={4}>
              {kpis.map((item) => (
                <StatCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  icon={item.icon}
                  tone={item.tone}
                />
              ))}
            </StatCardGrid>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {isLoading ? (
            <>
              <ChartSkeleton />
              <TopCoursesSkeleton />
            </>
          ) : (
            <>
              <EnrollmentStatusChart
                data={statusBarData}
                hasEnrollments={!!(enrollments && enrollments.length > 0)}
              />

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut", delay: 0.4 }}
              >
                <Card className="bg-card border border-border rounded-lg shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 rounded-lg bg-muted flex items-center justify-center">
                        <BookOpen className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Top Enrolled Courses
                      </h2>
                    </div>
                    {topCourses.length > 0 ? (
                      <ul className="space-y-2.5">
                        {topCourses.map((tc, idx) => (
                          <motion.li
                            key={tc.courseId}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut", delay: 0.4 + idx * 0.06 }}
                            className="flex items-center justify-between gap-3 min-w-0"
                          >
                            <span className="text-[13px] text-foreground truncate min-w-0">
                              {tc.title}
                            </span>
                            <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-[1.5rem] px-1.5 rounded-md bg-muted text-foreground text-[11px] font-semibold tabular-nums">
                              {tc.count}
                            </span>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        title="No courses enrolled"
                        description="Start learning to see top courses here."
                        compact
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
