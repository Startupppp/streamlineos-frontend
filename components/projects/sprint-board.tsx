"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar, Target, CheckCircle2 } from "lucide-react";
import { useSprints } from "../../lib/hooks/trpc-hooks";
import { format } from "date-fns";
import { KanbanBoard } from "./kanban-board";
import { motion } from "framer-motion";

interface SprintBoardProps {
  sprintId: number;
  projectId: number;
}

export function SprintBoard({ sprintId, projectId }: SprintBoardProps) {
  const { data: sprint, isLoading } = useSprints(projectId);

  const currentSprint = sprint?.find((s) => s.id === sprintId);

  if (isLoading) {
    return <div>Loading sprint...</div>;
  }

  if (!currentSprint) {
    return <div>Sprint not found</div>;
  }

  const rawTickets = currentSprint.tickets || [];
  const tickets = rawTickets.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status ?? "TODO",
    type: t.type ?? "TASK",
    priority: t.priority ?? undefined,
    points: t.points ?? null,
    timeSpent: t.timeSpent ?? null,
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          firstName: t.assignee.firstName ?? undefined,
          lastName: t.assignee.lastName ?? undefined,
        }
      : null,
  }));
  const totalPoints = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tickets
    .filter((t) => t.status === "DONE")
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const progress = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{currentSprint.name}</CardTitle>
                {currentSprint.goal && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentSprint.goal}
                  </p>
                )}
              </div>
              <Badge
                variant={
                  currentSprint.status === "ACTIVE" ? "default" : "secondary"
                }
              >
                {currentSprint.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {format(new Date(currentSprint.startDate), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {format(new Date(currentSprint.endDate), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="font-medium">{Math.round(progress)}%</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>
                  Points: {completedPoints} / {totalPoints}
                </span>
                <span>
                  {tickets.filter((t) => t.status === "DONE").length} /{" "}
                  {tickets.length} tickets
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <KanbanBoard tickets={tickets} projectId={projectId} />
    </div>
  );
}
