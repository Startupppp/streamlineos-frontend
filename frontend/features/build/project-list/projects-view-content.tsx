"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ProjectCard } from "./project-card";
import { ProjectTable } from "./project-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { PmStaggerList } from "@/components/pm-chrome";
import { fadeUp, fadeUpReduced } from "@/lib/motion-presets";
import type { DisplayPrefs } from "./use-display-prefs";
import type { ProjectListItem } from "@/types/projects/projects";

const GroupingSidebar = dynamic(
  () =>
    import("./grouping-sidebar").then((m) => ({ default: m.GroupingSidebar })),
  { ssr: false, loading: () => null },
);

interface ProjectsViewContentProps {
  viewMode: "grid" | "list";
  visibleProjects: ProjectListItem[];
  allProjects: ProjectListItem[];
  prefs: DisplayPrefs;
  pageCount: number;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  showGroupingSidebar: boolean;
  onGroupingSidebarChange: (open: boolean) => void;
  activeGroup: string | null;
  onGroupSelect: (group: string | null) => void;
  shouldReduceMotion: boolean | null;
}

export function ProjectsViewContent({
  viewMode,
  visibleProjects,
  allProjects,
  prefs,
  pageCount,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showGroupingSidebar,
  onGroupingSidebarChange,
  activeGroup,
  onGroupSelect,
  shouldReduceMotion,
}: ProjectsViewContentProps) {
  if (viewMode === "grid") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PmStaggerList
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            role="list"
            aria-label="Projects grid"
          >
            {visibleProjects.map((project) => (
              <motion.div
                key={project.id}
                variants={shouldReduceMotion ? fadeUpReduced : fadeUp}
                className="h-full min-w-0"
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </PmStaggerList>
        </div>
        {visibleProjects.length > 0 ? (
          <TablePagination
            mode="cursor"
            cursorVariant="load-more"
            rowCount={visibleProjects.length}
            pageNumber={pageCount}
            hasMore={Boolean(hasNextPage)}
            onNext={onLoadMore}
            disabled={isFetchingNextPage}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 motion-reduce:transition-none">
      <div className="flex min-w-0 flex-1 flex-col">
        <ProjectTable
          projects={visibleProjects}
          prefs={prefs}
          hasMore={Boolean(hasNextPage)}
          pageNumber={pageCount}
          onLoadMore={onLoadMore}
        />
      </div>
      <GroupingSidebar
        open={showGroupingSidebar}
        onOpenChange={onGroupingSidebarChange}
        projects={allProjects}
        activeGroup={activeGroup}
        onGroupSelect={onGroupSelect}
      />
    </div>
  );
}
