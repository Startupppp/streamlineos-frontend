"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { BookOpen, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses, useCourseCategories, useEnrollCourse } from "@/hooks/api/hr/courses";
import { getErrorMessage } from "@/lib/api-client";
import type { Course } from "@/hooks/api/hr/courses";

interface Props {
  canManage: boolean;
}

const TYPE_LABELS: Record<Course["type"], string> = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
  BLENDED: "Blended",
};

const FORMAT_LABELS: Record<Course["format"], string> = {
  SELF_PACED: "Self-Paced",
  ILT: "Instructor-Led",
  VIRTUAL: "Virtual",
  BLENDED: "Blended",
};

const STATUS_COLORS: Record<Course["status"], string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-amber-50 text-amber-700",
};

const GRADIENT_COLORS = [
  "from-violet-500 to-indigo-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-violet-600",
];

function CourseCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <Skeleton className="h-36 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function CourseCatalog({ canManage }: Props) {
  const { data: courses = [], isLoading } = useCourses();
  const { data: categories = [] } = useCourseCategories();
  const enroll = useEnrollCourse();

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  function handleEnroll(courseId: number) {
    enroll.mutate(courseId, {
      onSuccess: () => toast.success("Enrolled successfully"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCategoryChange(v: string) {
    setCategoryFilter(v);
  }

  function handleTypeChange(v: string) {
    setTypeFilter(v);
  }

  function handleFormatChange(v: string) {
    setFormatFilter(v);
  }

  function handleMandatoryToggle(checked: boolean) {
    setMandatoryOnly(checked);
  }

  const filtered = courses.filter((c) => {
    if (categoryFilter !== "all" && String(c.categoryId) !== categoryFilter) return false;
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (formatFilter !== "all" && c.format !== formatFilter) return false;
    if (mandatoryOnly && !c.isMandatory) return false;
    return true;
  });

  void canManage;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
            <SelectItem value="BLENDED">Blended</SelectItem>
          </SelectContent>
        </Select>

        <Select value={formatFilter} onValueChange={handleFormatChange}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
            <SelectItem value="ILT">Instructor-Led</SelectItem>
            <SelectItem value="VIRTUAL">Virtual</SelectItem>
            <SelectItem value="BLENDED">Blended</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Switch id="mandatory-toggle" checked={mandatoryOnly} onCheckedChange={handleMandatoryToggle} />
          <Label htmlFor="mandatory-toggle" className="text-xs text-muted-foreground cursor-pointer">
            Mandatory only
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center h-64 text-center">
          <div className="p-4 rounded-2xl bg-muted mb-4">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No courses found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course, idx) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.06 }}
              className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className={`h-36 bg-gradient-to-br ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]} flex items-center justify-center relative overflow-hidden`}>
                {course.thumbnailUrl ? (
                  <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
                ) : (
                  <BookOpen className="h-12 w-12 text-white/80" />
                )}
                <div className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[course.status]}`}>
                  {course.status}
                </div>
                {course.isMandatory && (
                  <div className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">
                    Required
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{course.title}</h3>
                  {(course.externalInstructor ?? course.instructorId) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.externalInstructor ?? "Internal instructor"}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    {FORMAT_LABELS[course.format]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                    {TYPE_LABELS[course.type]}
                  </Badge>
                  {course.durationHours && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {course.durationHours}h
                    </span>
                  )}
                </div>

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    onClick={() => handleEnroll(course.id)}
                    disabled={enroll.isPending || course.status !== "PUBLISHED"}
                  >
                    {course.status === "PUBLISHED" ? "Enroll" : "Not Available"}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
