"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    ListTodo,
    Settings,
    KanbanSquare,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Layers,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface ProjectSidebarProps {
    projectId: string;
    projectName: string;
    projectKey: string;
}

function ProjectSidebarContent({ 
    projectId, 
    projectName, 
    projectKey, 
    isCollapsed, 
    onToggleCollapse 
}: ProjectSidebarProps & { isCollapsed: boolean; onToggleCollapse: () => void }) {
    const pathname = usePathname();
    const baseUrl = `/projects/${projectId}`;

    const items = [
        { label: "Board", icon: KanbanSquare, href: `${baseUrl}` },
        { label: "Backlog", icon: ListTodo, href: `${baseUrl}/backlog` },
        { label: "Sprints", icon: Calendar, href: `${baseUrl}/sprints` },
        { label: "Epics", icon: Layers, href: `${baseUrl}/epics` },
        { label: "Settings", icon: Settings, href: `${baseUrl}/settings` },
    ];

    return (
        <div className={cn(
            "h-full flex flex-col bg-muted/10 border-r transition-all duration-300",
            isCollapsed ? "w-16" : "w-64"
        )}>
            <div className="p-4 border-b">
                <Link 
                    href="/projects" 
                    className={cn(
                        "flex items-center text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors",
                        isCollapsed && "justify-center"
                    )}
                >
                    <ChevronLeft className={cn("h-3 w-3", isCollapsed ? "mr-0" : "mr-1")} />
                    {!isCollapsed && <span>Back to Projects</span>}
                </Link>
                <div className={cn(
                    "flex items-center space-x-3",
                    isCollapsed && "justify-center"
                )}>
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {projectKey.substring(0, 2)}
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-sm line-clamp-1">{projectName}</h2>
                            <p className="text-xs text-muted-foreground">Software Project</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
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
                                "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group relative",
                                isActive
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                            {!isCollapsed && <span>{item.label}</span>}
                            {isCollapsed && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    );
                })}
                 
            </div>

            {isCollapsed && (
                <div className="p-2 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleCollapse}
                        className="w-full justify-center text-muted-foreground hover:text-foreground"
                        title="Expand"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {!isCollapsed && (
                <div className="p-2 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleCollapse}
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Collapse
                    </Button>
                </div>
            )}
        </div>
    );
}

export function ProjectSidebar(props: ProjectSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <>
            
            <div className="hidden md:flex h-full flex-col">
                <ProjectSidebarContent 
                    {...props} 
                    isCollapsed={isCollapsed}
                    onToggleCollapse={toggleCollapse}
                />
            </div>

            
            <div className="md:hidden fixed top-[4.5rem] left-4 z-40">
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen} modal>
                    <SheetTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shadow-md bg-background border-border"
                            aria-label="Open project menu"
                            aria-expanded={isMobileOpen}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0">
                        <div className="h-full bg-background relative">
                            <ProjectSidebarContent 
                                {...props} 
                                isCollapsed={false}
                                onToggleCollapse={() => setIsMobileOpen(false)}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileOpen(false)}
                                className="absolute top-4 right-4"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
