
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
            <Card className="border-dashed shadow-none">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <FolderKanban className="h-10 w-10 mb-3 opacity-20" />
                        <p>No active projects found for this employee.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-none border-0">
            <CardHeader className="px-0 pt-0 pb-4">
                 <CardTitle className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    Active Projects 
                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs font-normal">
                        {projects.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-0">
                {projects.map((item) => (
                    <Link key={item.id} href={`/projects/${item.id}`} className="block group">
                        <div className="h-full border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card text-card-foreground shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 max-w-[70%]">
                                         <div className="p-2 rounded-md bg-primary/10 text-primary">
                                            <FolderKanban className="w-4 h-4" />
                                         </div>
                                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{item.name}</h3>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground font-medium border-0">
                                        {item.role || 'MEMBER'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 h-10 leading-relaxed">
                                    {item.description || "No description provided."}
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs text-center border-t border-dashed pt-4">
                                <div className="flex flex-col items-center gap-1 group/stat">
                                    <span className="text-muted-foreground/70 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1">
                                        To Do
                                    </span>
                                    <span className="font-bold text-base text-foreground group-hover/stat:text-primary transition-colors">
                                        {item.stats?.todo || 0}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group/stat">
                                    <span className="text-muted-foreground/70 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1">
                                        In Progress
                                    </span>
                                    <span className="font-bold text-base text-blue-600 group-hover/stat:scale-110 transition-transform">
                                        {item.stats?.inProgress || 0}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group/stat">
                                    <span className="text-muted-foreground/70 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1">
                                        Done
                                    </span>
                                    <span className="font-bold text-base text-green-600 group-hover/stat:scale-110 transition-transform">
                                        {item.stats?.done || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}
