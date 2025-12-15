import { getProjects } from "@/server/actions/project-actions";
import { NewProjectDialog } from "./new-project-dialog";
import Link from "next/link";
import {  Folder } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";


export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                <div className="flex items-center space-x-2">
                     <NewProjectDialog />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {projects.map(project => (
                     <Link key={project.id} href={`/projects/${project.id}`}>
                        <Card className="hover:bg-accent/50 transition cursor-pointer h-full flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {project.key}
                                </CardTitle>
                                <Folder className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="mt-4 flex-1">
                                <div className="text-2xl font-bold mb-1">{project.name}</div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {project.description || "No description provided."}
                                </p>
                            </CardContent>
                            <CardFooter className="justify-between">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Avatar className="h-6 w-6 mr-2">

                                        <AvatarImage src={project.manager?.image || undefined} />
                                        <AvatarFallback>M</AvatarFallback>
                                    </Avatar>

                                     {project.manager?.name || "Manager"}
                                </div>
                                <div className="text-xs text-muted-foreground uppercase">
                                    {project.status}
                                </div>
                            </CardFooter>
                        </Card>
                     </Link>
                 ))}
                 {projects.length === 0 && (
                     <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                         No projects found. Create one to get started.
                     </div>
                 )}
            </div>
        </div>
    );
}
