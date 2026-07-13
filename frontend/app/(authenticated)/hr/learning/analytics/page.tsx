"use client";

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BookOpen,
  Users,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
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

interface KpiItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}

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

function KpiCard({ item, delay }: { item: KpiItem; delay: number }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay }}
    >
      <Card className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <p className={cn("text-3xl font-bold tabular-nums leading-none", item.valueColor)}>
                {item.value}
              </p>
            </div>
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", item.iconBg)}>
              <Icon className={cn("h-4 w-4", item.iconColor)} aria-hidden="true" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function KpiSkeletons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-8 w-14" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
        {Array.from({ length: 4 }).map((_, i) => (
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

  const kpis: KpiItem[] = useMemo(
    () => [
      {
        label: "Total Courses",
        value: publishedCount,
        icon: BookOpen,
        iconBg: "bg-muted",
        iconColor: "text-foreground",
        valueColor: "text-foreground",
      },
      {
        label: "Total Enrolled",
        value: totalEnrolled,
        icon: Users,
        iconBg: "bg-blue-50 dark:bg-blue-500/10",
        iconColor: "text-blue-600 dark:text-blue-400",
        valueColor: "text-foreground",
      },
      {
        label: "Avg Completion",
        value: `${avgCompletion}%`,
        icon: TrendingUp,
        iconBg: "bg-amber-50 dark:bg-amber-500/10",
        iconColor: "text-amber-600 dark:text-amber-400",
        valueColor: "text-foreground",
      },
      {
        label: "Completed",
        value: completedCount,
        icon: CheckCircle2,
        iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        valueColor: "text-foreground",
      },
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
          <KpiSkeletons />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((item, i) => (
              <KpiCard key={item.label} item={item} delay={i * 0.08} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {isLoading ? (
            <>
              <ChartSkeleton />
              <TopCoursesSkeleton />
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut", delay: 0.32 }}
              >
                <Card className="bg-card border border-border rounded-lg shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                        <BarChart3 className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Enrollment by Status
                      </h2>
                    </div>
                    {enrollments && enrollments.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={statusBarData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                          <XAxis
                            dataKey="status"
                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="Enrollments"
                            radius={[4, 4, 0, 0]}
                            fill="var(--primary)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState
                        title="No enrollment data"
                        description="Enroll in courses to see your progress here."
                        compact
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut", delay: 0.4 }}
              >
                <Card className="bg-card border border-border rounded-lg shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
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
