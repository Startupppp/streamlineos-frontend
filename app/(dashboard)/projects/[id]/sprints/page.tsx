"use client";

import { use, useState } from "react";
import { api } from "@/trpc/react";
import { CreateSprintDialog } from "@/components/projects/create-sprint-dialog";
import { EditSprintDialog } from "@/components/projects/edit-sprint-dialog";
import { BurndownChart } from "@/components/projects/burndown-chart";
import { VelocityChart } from "@/components/projects/velocity-chart";
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
  Loader2,
  Pencil,
  ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";
import { EmptySprintIllustration } from "@/components/illustrations";
import { format, differenceInDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SprintsPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);

  const { data: sprints, isLoading } = api.project.getSprints.useQuery({ projectId });
  const { data: project } = api.project.getProjectDetails.useQuery({ id: projectId });
  const utils = api.useUtils();

  const [planningSprintId, setPlanningSprintId] = useState<number | null>(null);
  const [completionSprintId, setCompletionSprintId] = useState<number | null>(null);
  const [moveToOption, setMoveToOption] = useState<string>("backlog");

  const updateSprint = api.project.updateSprint.useMutation({
    onSuccess: () => {
      utils.project.getSprints.invalidate();
      toast.success("Sprint updated");
    },
    onError: (error) => toast.error(error.message || "Failed to update sprint"),
  });

  const updateTicket = api.project.updateTicket.useMutation({
    onSuccess: () => {
      utils.project.getSprints.invalidate();
      utils.project.getProjectDetails.invalidate();
    },
  });

  function handleStartSprint(sprintId: number) {
    updateSprint.mutate({ sprintId, status: "ACTIVE" });
  }

  function handleCompleteSprint(sprintId: number) {
    setCompletionSprintId(sprintId);
  }

  function confirmCompleteSprint() {
    if (!completionSprintId) return;
    const sprint = sprints?.find(s => s.id === completionSprintId);
    if (!sprint) return;

    const incompleteTickets = (sprint.tickets || []).filter(t => t.status !== "DONE");
    const nextSprint = sprints?.find(s => s.status === "PLANNED");

    // Move incomplete tickets
    const targetSprintId = moveToOption === "backlog" ? undefined :
      moveToOption === "next" && nextSprint ? nextSprint.id : undefined;
    const promises = incompleteTickets.map(ticket =>
      updateTicket.mutateAsync({
        ticketId: ticket.id,
        sprintId: targetSprintId,
      })
    );

    Promise.all(promises)
      .then(() => {
        updateSprint.mutate({ sprintId: completionSprintId, status: "COMPLETED" });
        setCompletionSprintId(null);
      })
      .catch(() => {
        toast.error("Failed to move some tickets");
      });
  }

  // Sprint planning drag handler
  function handlePlanningDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const ticketId = parseInt(draggableId);
    const newSprintId = destination.droppableId === "backlog" ? undefined : parseInt(destination.droppableId);

    updateTicket.mutate({
      ticketId,
      ...(newSprintId !== undefined ? { sprintId: newSprintId } : {}),
    });
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

  // Backlog tickets (not in any sprint)
  const allTickets = project?.tickets || [];
  const backlogTickets = allTickets.filter(t => !t.sprintId && t.type !== "EPIC");

  const planningSprint = planningSprintId ? sprints?.find(s => s.id === planningSprintId) : null;
  const completionSprint = completionSprintId ? sprints?.find(s => s.id === completionSprintId) : null;
  const incompleteCount = completionSprint
    ? (completionSprint.tickets || []).filter(t => t.status !== "DONE").length
    : 0;
  const nextPlannedSprint = sprints?.find(s => s.status === "PLANNED");

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8" aria-live="polite">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sprints</h1>
          <p className="text-muted-foreground mt-1">
            {activeSprints.length > 0 && `${activeSprints.length} active`}
            {activeSprints.length > 0 && plannedSprints.length > 0 && ", "}
            {plannedSprints.length > 0 && `${plannedSprints.length} planned`}
            {(activeSprints.length > 0 || plannedSprints.length > 0) && completedSprints.length > 0 && ", "}
            {completedSprints.length > 0 && `${completedSprints.length} completed`}
            {sprints?.length === 0 && "Create your first sprint to start organizing work"}
          </p>
        </div>
        <CreateSprintDialog projectId={projectId} />
      </div>

      {/* Sprint Planning Mode */}
      {planningSprintId && planningSprint && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Planning: {planningSprint.name}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setPlanningSprintId(null)}>
                Done Planning
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handlePlanningDragEnd}>
              <div className="grid grid-cols-2 gap-4">
                {/* Backlog */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Backlog ({backlogTickets.length})</h4>
                  <Droppable droppableId="backlog">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[200px] rounded-lg border border-dashed p-2 space-y-1",
                          snapshot.isDraggingOver && "bg-primary/5 border-primary/30"
                        )}
                      >
                        {backlogTickets.map((ticket, index) => (
                          <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="p-2 bg-card rounded border text-sm flex items-center justify-between"
                              >
                                <span className="truncate">{ticket.title}</span>
                                {ticket.points && (
                                  <Badge variant="secondary" className="text-xs ml-2 shrink-0">{ticket.points}</Badge>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {backlogTickets.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-8">No backlog tickets</p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
                {/* Sprint */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">{planningSprint.name} ({(planningSprint.tickets || []).length})</h4>
                  <Droppable droppableId={planningSprint.id.toString()}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[200px] rounded-lg border border-dashed p-2 space-y-1",
                          snapshot.isDraggingOver && "bg-primary/5 border-primary/30"
                        )}
                      >
                        {(planningSprint.tickets || []).map((ticket, index) => (
                          <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="p-2 bg-card rounded border text-sm flex items-center justify-between"
                              >
                                <span className="truncate">{ticket.title}</span>
                                {ticket.points && (
                                  <Badge variant="secondary" className="text-xs ml-2 shrink-0">{ticket.points}</Badge>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {(planningSprint.tickets || []).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-8">Drag tickets here</p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            </DragDropContext>
          </CardContent>
        </Card>
      )}

      {/* Active Sprints */}
      {activeSprints.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-500" />
            Active Sprints
          </h2>
          <div className="grid gap-4">
            {activeSprints.map((sprint) => (
              <div key={sprint.id} className="space-y-4">
                <SprintCard
                  sprint={sprint}
                  projectId={projectId}
                  onComplete={() => handleCompleteSprint(sprint.id)}
                  onPlan={() => setPlanningSprintId(sprint.id)}
                  isUpdating={updateSprint.isPending}
                />
                <BurndownChart sprintId={sprint.id} />
              </div>
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
                onPlan={() => setPlanningSprintId(sprint.id)}
                isUpdating={updateSprint.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Velocity Chart */}
      {completedSprints.length > 0 && (
        <VelocityChart sprints={completedSprints} />
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
            <EmptySprintIllustration className="mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sprints yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first sprint to start organizing your work
            </p>
            <CreateSprintDialog projectId={projectId} />
          </CardContent>
        </Card>
      )}

      {/* Sprint Completion Dialog */}
      <Dialog open={!!completionSprintId} onOpenChange={(open) => !open && setCompletionSprintId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Complete Sprint: {completionSprint?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {incompleteCount > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {incompleteCount} ticket{incompleteCount > 1 ? "s are" : " is"} not done. Where should they go?
                </p>
                <Select value={moveToOption} onValueChange={setMoveToOption}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Move to Backlog</SelectItem>
                    {nextPlannedSprint && (
                      <SelectItem value="next">Move to {nextPlannedSprint.name}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">All tickets are done! Ready to complete this sprint.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionSprintId(null)}>Cancel</Button>
            <Button onClick={confirmCompleteSprint} disabled={updateSprint.isPending}>
              {updateSprint.isPending ? "Completing..." : "Complete Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      title?: string;
      status: string | null;
      points: number | null;
    }>;
  };
  projectId: number;
  onStart?: () => void;
  onComplete?: () => void;
  onPlan?: () => void;
  isUpdating?: boolean;
}

function SprintCard({ sprint, projectId, onStart, onComplete, onPlan, isUpdating }: SprintCardProps) {
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
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Sprint actions for ${sprint.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <EditSprintDialog
                  sprint={sprint}
                  trigger={
                    <button className="flex items-center w-full px-2 py-1.5 text-sm">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Sprint
                    </button>
                  }
                />
              </DropdownMenuItem>
              {onPlan && (
                <DropdownMenuItem onClick={onPlan}>
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Plan Sprint
                </DropdownMenuItem>
              )}
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
          <div
            className="w-full bg-secondary rounded-full h-2"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Sprint progress: ${completedPoints} of ${totalPoints} points`}
          >
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
