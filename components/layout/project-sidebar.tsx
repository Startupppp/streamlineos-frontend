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
  Calendar,
  RefreshCcw,
  Package,
  GanttChart,
  FileText,
  BarChart3,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface ProjectSidebarProps {
  projectId: string;
  projectName: string;
  projectKey: string;
}

interface NavSection {
  label: string;
  items: { label: string; icon: React.ComponentType<{ className?: string }>; href: string }[];
}

function ProjectSidebarContent({
  projectId,
  projectName,
  projectKey,
  isCollapsed,
  onToggleCollapse,
}: ProjectSidebarProps & { isCollapsed: boolean; onToggleCollapse: () => void }) {
  const pathname = usePathname();
  const baseUrl = `/projects/${projectId}`;

  const sections: NavSection[] = [
    {
      label: "Planning",
      items: [
        { label: "Board", icon: KanbanSquare, href: baseUrl },
        { label: "Backlog", icon: ListTodo, href: `${baseUrl}/backlog` },
        { label: "Sprints", icon: Calendar, href: `${baseUrl}/sprints` },
      ],
    },
    {
      label: "Tracking",
      items: [
        { label: "Cycles", icon: RefreshCcw, href: `${baseUrl}/cycles` },
        { label: "Modules", icon: Package, href: `${baseUrl}/modules` },
        { label: "Epics", icon: Layers, href: `${baseUrl}/epics` },
        { label: "Timeline", icon: GanttChart, href: `${baseUrl}/timeline` },
      ],
    },
    {
      label: "More",
      items: [
        { label: "Wiki", icon: FileText, href: `${baseUrl}/wiki` },
        { label: "Reports", icon: BarChart3, href: `${baseUrl}/analytics` },
        { label: "Intake", icon: Inbox, href: `${baseUrl}/intake` },
        { label: "Settings", icon: Settings, href: `${baseUrl}/settings` },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === baseUrl) return pathname === baseUrl;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-muted/10 border-r transition-all duration-300",
        isCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className="p-3 border-b">
        <Link
          href="/projects"
          className={cn(
            "flex items-center text-xs text-muted-foreground mb-3 hover:text-foreground transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          <ChevronLeft className={cn("h-3 w-3", !isCollapsed && "mr-1")} />
          {!isCollapsed && <span>Projects</span>}
        </Link>
        <div className={cn("flex items-center gap-2.5", isCollapsed && "justify-center")}>
          <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {projectKey.substring(0, 2)}
          </div>
          {!isCollapsed && (
            <h2 className="font-semibold text-sm line-clamp-1 min-w-0">{projectName}</h2>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-2 px-2 overflow-y-auto space-y-1">
        {sections.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <div className="my-2 border-t" />}
            {!isCollapsed && (
              <p className="px-2 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-2 py-1.5 text-[13px] font-medium rounded-md transition-colors group relative",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed && "justify-center px-1.5"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-2.5")} />
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
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function ProjectSidebar(props: ProjectSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex h-full flex-col">
        <ProjectSidebarContent
          {...props}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden fixed top-[4.5rem] left-4 z-40">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen} modal>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shadow-md bg-background border-border"
              aria-label="Open project menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
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
                className="absolute top-3 right-3"
                aria-label="Close project menu"
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
