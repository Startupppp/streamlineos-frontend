"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { motion } from "framer-motion";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

interface EpicViewProps {
  projectId: number;
}

export function EpicView({ projectId }: EpicViewProps) {
  const { data: project, isLoading } = useProject(projectId);
  const [expandedEpics, setExpandedEpics] = useState<Set<number>>(new Set());

  if (isLoading) {
    return <div>Loading epics...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const epics = project.tickets?.filter((t) => t.type === "EPIC") || [];
  const stories = project.tickets?.filter((t) => t.type === "STORY") || [];
  const tasks = project.tickets?.filter((t) => t.type === "TASK") || [];

  const toggleEpic = (epicId: number) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  const getEpicStories = (epicId: number) => {
    return stories.filter((s) => s.epicId === epicId);
  };

  const getStoryTasks = (storyId: number) => {
    return tasks.filter((t) => {
      const story = stories.find((s) => s.id === storyId);
      return story && t.projectId === story.projectId;
    });
  };

  return (
    <div className="space-y-4">
      {epics.map((epic) => {
        const isExpanded = expandedEpics.has(epic.id);
        const epicStories = getEpicStories(epic.id);
        const epicPoints = epicStories.reduce((sum, s) => sum + (s.points || 0), 0);
        const completedPoints = epicStories
          .filter((s) => s.status === "DONE")
          .reduce((sum, s) => sum + (s.points || 0), 0);

        return (
          <motion.div
            key={epic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEpic(epic.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <CardTitle className="text-lg">{epic.title}</CardTitle>
                    <Badge variant="outline">EPIC</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {completedPoints} / {epicPoints} pts
                    </span>
                    <Badge variant={epic.status === "DONE" ? "default" : "secondary"}>
                      {epic.status}
                    </Badge>
                  </div>
                </div>
                {epic.description && (
                  <p className="text-sm text-muted-foreground mt-2">{epic.description}</p>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {epicStories.map((story) => {
                      const storyTasks = getStoryTasks(story.id);
                      return (
                        <div key={story.id} className="pl-6 border-l-2 border-muted">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                STORY
                              </Badge>
                              <span className="font-medium">{story.title}</span>
                            </div>
                            <Badge variant={story.status === "DONE" ? "default" : "secondary"}>
                              {story.status}
                            </Badge>
                          </div>
                          {storyTasks.length > 0 && (
                            <div className="pl-4 space-y-1 mt-2">
                              {storyTasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between text-sm text-muted-foreground"
                                >
                                  <span>• {task.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {task.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {epicStories.length === 0 && (
                      <p className="text-sm text-muted-foreground pl-6">No stories in this epic</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        );
      })}
      {epics.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No epics found. Create an epic to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

