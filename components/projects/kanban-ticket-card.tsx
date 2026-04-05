"use client";

import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  MoreHorizontal, Lock,
  CheckSquare, Bug, Bookmark, Zap,
  ArrowUp, ArrowDown, AlertCircle, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface KanbanTicket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string;
  points?: number | null;
  timeSpent?: string | null;
  ticketNumber?: number;
  epicId?: number | null;
  assignee?: { firstName?: string; lastName?: string; id: string; image?: string | null } | null;
  assignees?: Array<{ userId: string; user: { firstName?: string; lastName?: string; id: string; image?: string | null } }>;
  order?: number | null;
  labels?: Array<{ label: { id: number; name: string; color: string | null } }>;
  _restricted?: boolean;
}

export interface KanbanColumn {
  id: string;
  label: string;
  color: string | null | undefined;
}

function TicketTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "BUG": return <Bug className="h-3 w-3 text-red-500" />;
    case "STORY": return <Bookmark className="h-3 w-3 text-green-500" />;
    case "EPIC": return <Zap className="h-3 w-3 text-purple-500" />;
    default: return <CheckSquare className="h-3 w-3 text-blue-500" />;
  }
}

function PriorityIcon({ priority }: { priority: string }) {
  switch (priority) {
    case "LOW": return <ArrowDown className="h-3 w-3 text-slate-500" />;
    case "HIGH": return <ArrowUp className="h-3 w-3 text-orange-500" />;
    case "URGENT": return <AlertCircle className="h-3 w-3 text-red-500" />;
    default: return <ArrowRight className="h-3 w-3 text-blue-500" />;
  }
}

function MoveColumnItem({
  id, label, currentStatus, onMove,
}: { id: string; label: string; currentStatus: string; onMove: (id: string) => void }) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMove(id);
  }, [id, onMove]);

  return (
    <DropdownMenuItem onClick={handleClick} disabled={id === currentStatus}>
      Move to {label}
    </DropdownMenuItem>
  );
}

interface KanbanTicketCardProps {
  ticket: KanbanTicket;
  columns: KanbanColumn[];
  epicMap: Map<number, string>;
  isDragging: boolean;
  dragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onSelect: (id: number) => void;
  onMove: (id: number, columnId: string) => void;
}

export function KanbanTicketCard({
  ticket, columns, epicMap, isDragging, dragStartRef, onSelect, onMove,
}: KanbanTicketCardProps) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }, [dragStartRef]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (ticket._restricted) {
      toast.info("You don't have access to this ticket's details.");
      return;
    }
    if (dragStartRef.current) {
      const moved =
        Math.abs(e.clientX - dragStartRef.current.x) > 5 ||
        Math.abs(e.clientY - dragStartRef.current.y) > 5;
      dragStartRef.current = null;
      if (!moved) onSelect(ticket.id);
    } else {
      onSelect(ticket.id);
    }
  }, [ticket._restricted, ticket.id, onSelect, dragStartRef]);

  const handleMove = useCallback((columnId: string) => {
    onMove(ticket.id, columnId);
  }, [ticket.id, onMove]);

  return (
    <Card
      className={cn(
        "transition-all duration-200 bg-card group border-border",
        ticket._restricted
          ? "cursor-default opacity-75"
          : "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/20",
        isDragging && "shadow-xl rotate-1 scale-[1.02] border-primary/30"
      )}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <CardContent className="p-2.5 sm:p-3 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-snug flex-1">
            {ticket.title}
          </h4>
          {ticket._restricted ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label={`Actions for ${ticket.title}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {columns.map((c) => (
                  <MoveColumnItem
                    key={c.id}
                    id={c.id}
                    label={c.label}
                    currentStatus={ticket.status}
                    onMove={handleMove}
                  />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {((ticket.labels && ticket.labels.length > 0) || (ticket.epicId && epicMap.has(ticket.epicId))) && (
          <div className="flex items-center gap-1 flex-wrap">
            {ticket.epicId && epicMap.has(ticket.epicId) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 truncate max-w-[140px]">
                {epicMap.get(ticket.epicId)}
              </span>
            )}
            {ticket.labels?.slice(0, 3).map(({ label }) => (
              <span
                key={label.id}
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: label.color || "#3b82f6" }}
                title={label.name}
              />
            ))}
            {(ticket.labels?.length || 0) > 3 && (
              <span className="text-[9px] text-muted-foreground">+{ticket.labels!.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <TicketTypeIcon type={ticket.type} />
            {ticket.priority && <PriorityIcon priority={ticket.priority} />}
            <span className="text-[10px] text-muted-foreground font-mono">
              #{ticket.ticketNumber ?? ticket.id}
            </span>
            {ticket.points != null && ticket.points > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">
                {ticket.points}
              </Badge>
            )}
          </div>
          {ticket.assignees && ticket.assignees.length > 1 ? (
            <div className="flex -space-x-2">
              {ticket.assignees.slice(0, 3).map(({ user }) => (
                <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={resolveImageUrl(user.image)} />
                  <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-medium">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {ticket.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground font-medium">+{ticket.assignees.length - 3}</span>
                </div>
              )}
            </div>
          ) : ticket.assignee ? (
            <Avatar className="h-7 w-7 border border-background ring-2 ring-background">
              <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-medium">
                {ticket.assignee.firstName?.[0]}
                {ticket.assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">?</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
