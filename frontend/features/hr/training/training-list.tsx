"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  MapPin,
  Link,
  Users,
  Monitor,
  BookMarked,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import {
  useTrainingPrograms,
  useEnrollTraining,
  type TrainingProgram,
} from "@/hooks/api/hr/training";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  canManage: boolean;
  onSelectProgram: (id: number) => void;
  selectedProgramId: number | null;
}

const STATUS_COLORS: Record<TrainingProgram["status"], string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  CANCELLED: "bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
};

const TYPE_COLORS: Record<TrainingProgram["type"], string> = {
  MANDATORY: "bg-red-50 text-red-700 border-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  OPTIONAL: "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  COMPLIANCE: "bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
};

const FORMAT_ICONS: Record<TrainingProgram["format"], React.ReactNode> = {
  CLASSROOM: <MapPin className="h-3 w-3" />,
  VIRTUAL: <Monitor className="h-3 w-3" />,
  BLENDED: <BookMarked className="h-3 w-3" />,
  SELF_PACED: <BookOpen className="h-3 w-3" />,
};

export function TrainingList({ canManage, onSelectProgram, selectedProgramId }: Props) {
  const { data: programs, isLoading } = useTrainingPrograms();
  const enroll = useEnrollTraining();
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  function handleEnroll(programId: number) {
    enroll.mutate(programId, {
      onSuccess: () => toast.success("Enrolled successfully"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleSelectProgram(id: number) {
    onSelectProgram(selectedProgramId === id ? 0 : id);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl border border-border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const filtered = (programs ?? []).filter((p) => {
    if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
    if (formatFilter !== "ALL" && p.format !== formatFilter) return false;
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="MANDATORY">Mandatory</SelectItem>
            <SelectItem value="OPTIONAL">Optional</SelectItem>
            <SelectItem value="COMPLIANCE">Compliance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Formats</SelectItem>
            <SelectItem value="CLASSROOM">Classroom</SelectItem>
            <SelectItem value="VIRTUAL">Virtual</SelectItem>
            <SelectItem value="BLENDED">Blended</SelectItem>
            <SelectItem value="SELF_PACED">Self-Paced</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustrationPreset="learning"
          title="No training programs"
          description={canManage ? "Create a program to get started" : "No programs available for your filters"}
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((program, idx) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.06 }}
              className={`bg-card rounded-2xl border shadow-sm p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                selectedProgramId === program.id
                  ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
                  : "border-border"
              }`}
              onClick={() => handleSelectProgram(program.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <TruncatedText text={program.name} className="text-sm font-semibold text-foreground" />
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border ${TYPE_COLORS[program.type]}`}>
                      {program.type}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border bg-muted text-muted-foreground border-border">
                      {FORMAT_ICONS[program.format]}
                      {program.format.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border shrink-0 ${STATUS_COLORS[program.status]}`}>
                  {program.status.replace("_", " ")}
                </span>
              </div>

              {program.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{program.description}</p>
              )}

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {format(new Date(program.startDate), "dd MMM yyyy")}
                    {program.endDate && ` – ${format(new Date(program.endDate), "dd MMM yyyy")}`}
                  </span>
                </div>
                {program.venue && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{program.venue}</span>
                  </div>
                )}
                {program.virtualLink && (
                  <div className="flex items-center gap-1.5">
                    <Link className="h-3 w-3 shrink-0" />
                    <a
                      href={program.virtualLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Join link
                    </a>
                  </div>
                )}
                {program.maxCapacity !== undefined && program.maxCapacity !== null && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 shrink-0" />
                    <span>Capacity: {program.maxCapacity}</span>
                  </div>
                )}
              </div>

              {program.status !== "COMPLETED" && program.status !== "CANCELLED" && (
                <Button
                  size="sm"
                  className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEnroll(program.id);
                  }}
                  disabled={enroll.isPending}
                >
                  {enroll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enroll"}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
