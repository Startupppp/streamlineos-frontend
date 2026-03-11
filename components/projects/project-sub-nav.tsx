"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSubNavProps {
  projectId: number;
  projectName?: string;
}

const tabs = [
  { label: "Board", suffix: "" },
  { label: "Backlog", suffix: "/backlog" },
  { label: "Sprints", suffix: "/sprints" },
  { label: "Epics", suffix: "/epics" },
  { label: "Settings", suffix: "/settings" },
];

export function ProjectSubNav({ projectId, projectName }: ProjectSubNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <div className="flex items-center gap-4 border-b border-border">
      <Link
        href="/projects"
        className="text-muted-foreground hover:text-foreground transition-colors pl-1"
        aria-label="Back to projects"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      {projectName && (
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {projectName}
        </span>
      )}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const isActive = tab.suffix === ""
            ? pathname === base
            : pathname.startsWith(href);

          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
