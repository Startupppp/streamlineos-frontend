"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
    ListTodo, 
    Settings, 
    KanbanSquare,
    ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface ProjectSidebarProps {
    projectId: string;
    projectName: string;
    projectKey: string;
}


function ProjectSidebarContent({ projectId, projectName, projectKey }: ProjectSidebarProps) {
    const pathname = usePathname();
    const baseUrl = `/projects/${projectId}`;

    const items = [
        { label: "Board", icon: KanbanSquare, href: `${baseUrl}` },
        { label: "Backlog", icon: ListTodo, href: `${baseUrl}/backlog` },
        { label: "Settings", icon: Settings, href: `${baseUrl}/settings` },
    ];

    return (
        <div className="h-full flex flex-col bg-muted/10">
            <div className="p-4 border-b">
                 <Link href="/projects" className="flex items-center text-xs text-muted-foreground mb-4 hover:text-foreground">
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Back to Projects
                 </Link>
                <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {projectKey.substring(0, 2)}
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm line-clamp-1">{projectName}</h2>
                        <p className="text-xs text-muted-foreground">Software Project</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 py-4 px-3 space-y-1">
                 {items.map(item => {
                     const isExactMatch = pathname === item.href;
                     const isChildRoute = item.href === baseUrl 
                       ? false 
                       : pathname?.startsWith(item.href + "/");
                     const isActive = isExactMatch || isChildRoute;
                     
                     return (
                     <Link 
                        key={item.href} 
                        href={item.href}
                        className={cn(
                            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive
                                ? "bg-primary/10 text-primary" 
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                     >
                         <item.icon className="h-4 w-4 mr-3" />
                         {item.label}
                     </Link>
                     );
                 })}
                 
                 <div className="my-4 border-t border-border/50 mx-2" />
                 
                 <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                     Development
                 </div>
                 <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground font-normal">
                     <div className="h-4 w-4 mr-3 border-2 border-dashed rounded-full" />
                     Releases
                 </Button>
            </div>
        </div>
    );
}

export function ProjectSidebar(props: ProjectSidebarProps) {
    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 border-r h-full flex-col">
                <ProjectSidebarContent {...props} />
            </div>

            {/* Mobile Sidebar Trigger */}
            <div className="md:hidden fixed top-[4.5rem] left-4 z-40">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="shadow-md bg-background border-border">
                            <Menu className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0">
                         <div className="h-full bg-background">
                            <ProjectSidebarContent {...props} />
                         </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
