
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckCircle2, Circle, Clock } from "lucide-react";
import Link from "next/link";

interface ProjectStats {
    todo: number;
    inProgress: number;
    done: number;
}

interface ProjectItem {
    id: number;
    name: string;
    role: string | null;
    description: string | null;
    stats?: ProjectStats;
}

export function EmployeeProjectsList({ projects }: { projects: ProjectItem[] }) {
    if (!projects || projects.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                        <FolderKanban className="h-10 w-10 mb-2 opacity-20" />
                        <p>No active projects found for this employee.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                 <CardTitle className="text-lg">Active Projects ({projects.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((item) => (
                    <Link key={item.id} href={`/projects/${item.id}`} className="block group">
                        <div className="border rounded-lg p-4 hover:border-primary transition-colors bg-card text-card-foreground shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold truncate group-hover:text-primary">{item.name}</h3>
                                <Badge variant="outline">{item.role}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                                {item.description || "No description provided."}
                            </p>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs text-center border-t pt-2">
                                <div className="flex flex-col items-center">
                                    <span className="text-muted-foreground mb-1 flex items-center gap-1">
                                        <Circle className="w-3 h-3" /> Todo
                                    </span>
                                    <span className="font-bold">{item.stats?.todo || 0}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-muted-foreground mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-blue-500" /> In Prog
                                    </span>
                                    <span className="font-bold text-blue-600">{item.stats?.inProgress || 0}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-muted-foreground mb-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" /> Done
                                    </span>
                                    <span className="font-bold text-green-600">{item.stats?.done || 0}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}
