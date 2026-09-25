"use client";

import { useCallback } from "react";
import type { PIP } from "@/hooks/api/hr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Pencil, CheckCircle2, Calendar, Trash2 } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";

interface PipCardProps {
  pip: PIP;
  onOpenEdit(pip: PIP): void;
  onUpdateStatus(id: number, status: string): void;
  /** `hr:performance:manage` — PATCH /hr/performance/pip/:id. */
  canManage: boolean;
  isUpdating: boolean;
}

export function PipCard({ pip, onOpenEdit, onUpdateStatus, canManage, isUpdating }: PipCardProps) {
  const handleEdit = useCallback(() => onOpenEdit(pip), [pip, onOpenEdit]);
  const handleComplete = useCallback(
    () => onUpdateStatus(pip.id, "COMPLETED"),
    [pip.id, onUpdateStatus],
  );
  const handleExtend = useCallback(
    () => onUpdateStatus(pip.id, "EXTENDED"),
    [pip.id, onUpdateStatus],
  );
  const handleTerminate = useCallback(
    () => onUpdateStatus(pip.id, "TERMINATED"),
    [pip.id, onUpdateStatus],
  );

  const isActionable = pip.status === "ACTIVE" || pip.status === "EXTENDED";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-7 shrink-0">
              <AvatarImage src={resolveImageUrl(pip.user?.image ?? null)} />
              <AvatarFallback className="text-micro bg-primary/10 text-primary">
                {pip.user?.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <TruncatedText
                text={pip.user?.name ?? "Employee"}
                className="text-sm font-medium"
              />
              <p className="text-micro text-muted-foreground">
                {pip.startDate} → {pip.endDate}
              </p>
              {pip.hrRep && (
                <p className="text-micro text-muted-foreground">
                  HR Rep: {pip.hrRep.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={
                pip.status === "COMPLETED"
                  ? "default"
                  : pip.status === "TERMINATED"
                    ? "destructive"
                    : pip.status === "EXTENDED"
                      ? "secondary"
                      : "outline"
              }
              className="text-micro"
            >
              {pip.status ?? "ACTIVE"}
            </Badge>
            {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedIconButton
                  icon={EllipsisIcon}
                  variant="ghost"
                  size="icon"
                  className="w-7"
                  aria-label="PIP actions"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </DropdownMenuItem>
                {isActionable && (
                  <>
                    <DropdownMenuItem disabled={isUpdating} onClick={handleComplete}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Mark Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isUpdating} onClick={handleExtend}>
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Extend
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={handleTerminate}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Terminate
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>
        {pip.reason && (
          <TruncatedText
            text={pip.reason}
            lines={2}
            className="text-xs text-muted-foreground mt-2"
          />
        )}
        {pip.objectives && pip.objectives.length > 0 && (
          <p className="text-micro text-muted-foreground mt-1">
            {pip.objectives.length} objective
            {pip.objectives.length !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
