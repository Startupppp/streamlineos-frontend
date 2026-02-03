"use client";

import { use } from "react";
import { api } from "@/trpc/react";
import { CreateSprintDialog } from "@/components/projects/create-sprint-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Target,
  CheckCircle2,
  Play,
  Square,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SprintsPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);

  const { data: sprints, isLoading } = api.project.getSprints.useQuery({ projectId });
  const utils = api.useUtils();

  const updateSprint = api.project.updateSprint.useMutation({
    onSuccess: () => {
      utils.project.getSprints.invalidate();
      toast.success("Sprint updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update sprint");
    },
  });

  function handleStartSprint(sprintId: number) {
    updateSprint.mutate({ sprintId, status: "ACTIVE" });
  }

  function handleCompleteSprint(sprintId: number) {
    updateSprint.mutate({ sprintId, status: "COMPLETED" });
  }

  function getSprintStatus(sprint: { status: string | null; startDate: Date; endDate: Date }) {
    if (sprint.status === "COMPLETED") return { label: "Completed", variant: "default" as const, color: "bg-green-500" };
    if (sprint.status === "ACTIVE") return { label: "Active", variant: "default" as const, color: "bg-blue-500" };

    if (isPast(sprint.endDate)) return { label: "Overdue", variant: "destructive" as const, color: "bg-red-500" };
    if (isFuture(sprint.startDate)) return { label: "Planned", variant: "secondary" as const, color: "bg-gray-500" };

    return { label: "Planned", variant: "secondary" as const, color: "bg-gray-500" };
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const activeSprints = sprints?.filter(s => s.status === "ACTIVE") || [];
  const plannedSprints = sprints?.filter(s => s.status === "PLANNED") || [];
  const completedSprints = sprints?.filter(s => s.status === "COMPLETED") || [];

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sprints</h1>
          <p className="text-muted-foreground mt-1">
            Manage your project sprints and track progress
          </p>
        </div>
        <CreateSprintDialog projectId={projectId} />
      </div>

      {/* Active Sprints */}
      {activeSprints.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-500" />
            Active Sprints
          </h2>
          <div className="grid gap-4">
            {activeSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                onComplete={() => handleCompleteSprint(sprint.id)}
                isUpdating={updateSprint.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Planned Sprints */}
      {plannedSprints.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            Planned Sprints
          </h2>
          <div className="grid gap-4">
            {plannedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                onStart={() => handleStartSprint(sprint.id)}
                isUpdating={updateSprint.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Completed Sprints
          </h2>
          <div className="grid gap-4">
            {completedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectId}
                isUpdating={updateSprint.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {sprints?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sprints yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first sprint to start organizing your work
            </p>
            <CreateSprintDialog projectId={projectId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SprintCardProps {
  sprint: {
    id: number;
    name: string;
    status: string | null;
    startDate: Date;
    endDate: Date;
    goal?: string | null;
    tickets?: Array<{
      id: number;
      status: string | null;
      points: number | null;
    }>;
  };
  projectId: number;
  onStart?: () => void;
  onComplete?: () => void;
  isUpdating?: boolean;
}

function SprintCard({ sprint, projectId, onStart, onComplete, isUpdating }: SprintCardProps) {
  const tickets = sprint.tickets || [];
  const totalPoints = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tickets
    .filter(t => t.status === "DONE")
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const progress = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

  const daysRemaining = differenceInDays(sprint.endDate, new Date());
  const totalDays = differenceInDays(sprint.endDate, sprint.startDate);

  const statusInfo = {
    ACTIVE: { label: "Active", variant: "default" as const },
    PLANNED: { label: "Planned", variant: "secondary" as const },
    COMPLETED: { label: "Completed", variant: "outline" as const },
  }[sprint.status || "PLANNED"] || { label: sprint.status || "PLANNED", variant: "secondary" as const };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link
                href={`/projects/${projectId}?sprint=${sprint.id}`}
                className="hover:text-primary transition-colors"
              >
                {sprint.name}
              </Link>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </CardTitle>
            {sprint.goal && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                {sprint.goal}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sprint.status === "PLANNED" && onStart && (
                <DropdownMenuItem onClick={onStart} disabled={isUpdating}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Sprint
                </DropdownMenuItem>
              )}
              {sprint.status === "ACTIVE" && onComplete && (
                <DropdownMenuItem onClick={onComplete} disabled={isUpdating}>
                  <Square className="h-4 w-4 mr-2" />
                  Complete Sprint
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/projects/${projectId}?sprint=${sprint.id}`}>
                  View Board
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Start Date</p>
            <p className="font-medium">{format(sprint.startDate, "MMM dd, yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">End Date</p>
            <p className="font-medium">{format(sprint.endDate, "MMM dd, yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">{totalDays} days</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {sprint.status === "COMPLETED" ? "Completed" : "Remaining"}
            </p>
            <p className={cn(
              "font-medium",
              sprint.status !== "COMPLETED" && daysRemaining < 0 && "text-red-500"
            )}>
              {sprint.status === "COMPLETED"
                ? "Done"
                : daysRemaining < 0
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : `${daysRemaining} days`
              }
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progress: {completedPoints} / {totalPoints} points</span>
            <span>{tickets.filter(t => t.status === "DONE").length} / {tickets.length} tickets</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
