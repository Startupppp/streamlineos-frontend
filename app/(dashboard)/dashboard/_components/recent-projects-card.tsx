"use client";

import { memo } from "react";
import Link from "next/link";
import { Folder } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { getColorSafe, projectStatusColors } from "@/lib/theme-constants";

interface Project {
  id: number;
  name: string;
  key: string;
  status?: string | null;
}

interface RecentProjectsCardProps {
  projects: Project[] | undefined;
  isLoading: boolean;
  error: unknown;
  onCreateProject: () => void;
}

export const RecentProjectsCard = memo(function RecentProjectsCard({ projects, isLoading, error, onCreateProject }: RecentProjectsCardProps) {
  return (
    <Card className="bg-card border-border shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground flex items-center gap-2">
          <Folder className="h-5 w-5 text-gold" aria-hidden="true" />
          Recent Projects
        </CardTitle>
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="hover:bg-gold/10 hover:text-gold" aria-label="View all projects">View All</Button>
        </Link>
      </CardHeader>
      <CardContent aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`proj-skel-${i}`} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">Failed to load projects.</p>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-gold/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center">
                      <Folder className="h-5 w-5 text-gold" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.key}</p>
                    </div>
                  </div>
                  <Badge className={getColorSafe(projectStatusColors, project.status || "ACTIVE")}>
                    {project.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            illustration={<EmptyProjectsIllustration />}
            title="No recent projects"
            description="Create your first project to start tracking work."
            action={{
              label: "Create Project",
              onClick: onCreateProject,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
});
