"use client";

import { useProjects } from "../../../lib/hooks/trpc-hooks";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  const projectsList = Array.isArray(projects) ? projects : [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Projects</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {projectsList.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {project.name}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description || "No description"}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                    {project.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : "No date"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {projectsList.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No active projects.
          </div>
        )}
      </div>
    </div>
  );
}
