"use client";

import { use, useState } from "react";
import { api } from "@/trpc/react";
import { CreateEpicDialog } from "@/components/projects/create-epic-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  BookOpen,
  Bug,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EpicsPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);

  const { data: project, isLoading } = api.project.getProjectDetails.useQuery({ id: projectId });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const tickets = project?.tickets || [];
  const epics = tickets.filter(t => t.type === "EPIC");
  const stories = tickets.filter(t => t.type === "STORY");
  const tasks = tickets.filter(t => t.type === "TASK");

  return (
    <div className="p-6 md:p-8 lg:p-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Epics</h1>
          <p className="text-muted-foreground mt-1">
            Organize work into large initiatives and track progress
          </p>
        </div>
        <CreateEpicDialog projectId={projectId} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{epics.length}</p>
                <p className="text-sm text-muted-foreground">Epics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stories.length}</p>
                <p className="text-sm text-muted-foreground">Stories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {tickets.filter(t => t.status === "DONE").length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Epics List */}
      <div className="space-y-4">
        {epics.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No epics yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first epic to organize related stories and tasks
              </p>
              <CreateEpicDialog projectId={projectId} />
            </CardContent>
          </Card>
        ) : (
          epics.map((epic) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              stories={stories.filter(s => s.epicId === epic.id)}
              allTickets={tickets}
              projectId={projectId}
            />
          ))
        )}
      </div>

      {/* Orphan Stories (not linked to any epic) */}
      {stories.filter(s => !s.epicId).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Stories without Epic
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {stories.filter(s => !s.epicId).map((story) => (
                  <div
                    key={story.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{story.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {story.status}
                      </Badge>
                    </div>
                    <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

interface EpicCardProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    status: string | null;
    priority?: string | null;
    points?: number | null;
  };
  stories: Array<{
    id: number;
    title: string;
    status: string | null;
    points?: number | null;
    epicId?: number | null;
  }>;
  allTickets: Array<{
    id: number;
    title: string;
    status: string | null;
    type: string | null;
    epicId?: number | null;
    points?: number | null;
  }>;
  projectId: number;
}

function EpicCard({ epic, stories, allTickets, projectId }: EpicCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalItems = stories.length;
  const completedItems = stories.filter(s => s.status === "DONE").length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const totalPoints = stories.reduce((sum, s) => sum + (s.points || 0), 0);
  const completedPoints = stories
    .filter(s => s.status === "DONE")
    .reduce((sum, s) => sum + (s.points || 0), 0);

  const statusColors: Record<string, string> = {
    TODO: "bg-gray-500",
    IN_PROGRESS: "bg-blue-500",
    IN_REVIEW: "bg-yellow-500",
    DONE: "bg-green-500",
  };

  const priorityColors: Record<string, string> = {
    LOW: "text-gray-500",
    MEDIUM: "text-blue-500",
    HIGH: "text-orange-500",
    URGENT: "text-red-500",
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 mt-0.5">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-500" />
                {epic.title}
              </CardTitle>
              {epic.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {epic.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(priorityColors[epic.priority || "MEDIUM"])}>
              {epic.priority || "MEDIUM"}
            </Badge>
            <Badge
              className={cn(
                "text-white",
                statusColors[epic.status || "TODO"] || "bg-gray-500"
              )}
            >
              {epic.status || "TODO"}
            </Badge>
          </div>
        </div>

        <div className="ml-9 mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedItems} of {totalItems} stories completed
            </span>
            <span className="text-muted-foreground">
              {completedPoints} / {totalPoints} points
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      {isExpanded && stories.length > 0 && (
        <CardContent className="pt-0 pb-4">
          <div className="ml-9 space-y-2 border-l-2 border-muted pl-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{story.title}</span>
                  {story.points && (
                    <Badge variant="secondary" className="text-xs">
                      {story.points} pts
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      story.status === "DONE" && "border-green-500 text-green-500"
                    )}
                  >
                    {story.status || "TODO"}
                  </Badge>
                  <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {isExpanded && stories.length === 0 && (
        <CardContent className="pt-0 pb-4">
          <div className="ml-9 p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No stories linked to this epic yet
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
