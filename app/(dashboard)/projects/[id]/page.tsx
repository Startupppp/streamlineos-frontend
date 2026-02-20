"use client";

import { useProject } from "../../../../lib/hooks/trpc-hooks";
import { KanbanBoard } from "../../../../components/projects/kanban-board";
import { notFound } from "next/navigation";
import { CreateTicketDialog } from "../../../../components/projects/create-ticket-dialog";
import { use } from "react";
import { KanbanBoardSkeleton } from "../../../../components/ui/kanban-skeleton";
import { Skeleton } from "../../../../components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const { data, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col w-full relative">
        {/* Header Skeleton */}
        <div className="flex-shrink-0 pl-6 pr-3 sm:pl-8 sm:pr-4 md:pl-12 md:pr-8 pt-6 sm:pt-8 md:pt-12 pb-4 mb-4 sm:mb-6 bg-background border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-5 w-72 mt-2" />
            </div>
          </div>
        </div>
        
        {/* Board Skeleton */}
        <div className="flex-1 min-h-0 w-full relative" style={{ minWidth: 0, overflow: 'hidden' }}>
          <div 
            className="h-full w-full" 
            style={{ 
              overflowX: 'scroll',
              overflowY: 'hidden',
              scrollbarWidth: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
              msOverflowStyle: 'scrollbar',
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          >
            <div className="inline-flex h-full pb-4 gap-3 sm:gap-4 md:gap-4" style={{ minWidth: 'max-content', paddingLeft: '12px', paddingRight: '12px' }}>
              <KanbanBoardSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return notFound();

  return (
    <div className="h-full flex flex-col w-full relative">
      <div className="flex-shrink-0 pl-6 pr-3 sm:pl-8 sm:pr-4 md:pl-12 md:pr-8 pt-6 sm:pt-8 md:pt-12 pb-4 mb-4 sm:mb-6 bg-background sticky top-0 z-50 border-b shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words">{data.name}</h1>
              <div className="flex flex-shrink-0">
                <CreateTicketDialog projectId={projectId} />
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground break-words mt-1">{data.description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full relative" style={{ minWidth: 0, overflow: 'hidden' }}>
        <div 
          className="h-full w-full kanban-scroll-container" 
          style={{ 
            overflowX: 'scroll',
            overflowY: 'hidden',
            scrollbarWidth: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarColor: 'rgba(0, 0, 0, 0.3) transparent',
            msOverflowStyle: 'scrollbar',
            position: 'relative',
            width: '100%',
            height: '100%'
          }}
        >
          <div className="inline-flex h-full pb-4 gap-3 sm:gap-4 md:gap-4" style={{ minWidth: 'max-content', paddingLeft: '24px', paddingRight: '12px' }}>
            <KanbanBoard
              tickets={(data.tickets || []).map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status ?? "TODO",
                type: t.type ?? "TASK",
                priority: t.priority ?? undefined,
                points: t.points ?? undefined,
                timeSpent: t.timeSpent ?? undefined,
                ticketNumber: t.ticketNumber,
                order: t.order ?? undefined,
                assignee: t.assignee
                  ? {
                      id: t.assignee.id,
                      firstName: t.assignee.firstName ?? undefined,
                      lastName: t.assignee.lastName ?? undefined,
                      image: t.assignee.image ?? null,
                    }
                  : null,
              }))}
              projectId={projectId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
