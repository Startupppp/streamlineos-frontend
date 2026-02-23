import { getProjects } from "@/server/actions/project-actions";
import { NewProjectDialog } from "./new-project-dialog";
import Link from "next/link";
import { Folder } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsEmptyState } from "./projects-empty-state";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  PLANNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ON_HOLD: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  COMPLETED: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  const activeCount = projects.filter(p => p.status === "ACTIVE").length;
  const completedCount = projects.filter(p => p.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${projects.length} project${projects.length !== 1 ? "s" : ""} total — ${activeCount} active, ${completedCount} completed.`}
        actions={<NewProjectDialog />}
      />

      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer h-full flex flex-col group border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {project.key}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Folder className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter className="justify-between pt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Avatar className="h-6 w-6 mr-2 border border-border">
                      <AvatarImage src={project.manager?.image || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {project.manager?.name?.charAt(0) || "M"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[100px]">
                      {project.manager?.name || "Manager"}
                    </span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${project.status ? statusColors[project.status] || "" : ""}`}
                  >
                    {project.status}
                  </Badge>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <ProjectsEmptyState />
      )}
    </div>
  );
}

