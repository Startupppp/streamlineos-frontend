"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EllipsisIcon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HiringFlow, HiringFlowRound } from "@/types/hr/recruitment";
import { RoundItem } from "./round-item";

interface FlowCardProps {
  flow: HiringFlow;
  onEdit: (flow: HiringFlow) => void;
  onAddRound: (flow: HiringFlow) => void;
  onEditRound: (round: HiringFlowRound, flowId: number) => void;
  onDelete: (flow: HiringFlow) => void;
}

export function FlowCard({ flow, onEdit, onAddRound, onEditRound, onDelete }: FlowCardProps) {
  const rounds = flow.rounds ?? [];

  function handleAddRound() {
    onAddRound(flow);
  }
  function handleEditFlow() {
    onEdit(flow);
  }
  function handleDeleteFlow() {
    onDelete(flow);
  }
  function handleEditRound(round: HiringFlowRound) {
    onEditRound(round, flow.id);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-sm font-semibold">
              <TruncatedText text={flow.name} />
            </CardTitle>
            {flow.isDefault && (
              <Badge variant="secondary" className="text-micro shrink-0">
                Default
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              variant="ghost"
              size="icon"
              className="w-7"
              aria-label="Add round"
              onClick={handleAddRound}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedIconButton
                  icon={EllipsisIcon}
                  variant="ghost"
                  size="icon"
                  className="w-7"
                  aria-label="Flow actions"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditFlow}>Rename flow</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteFlow}
                  className="text-destructive focus:text-destructive"
                >
                  Delete flow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {rounds.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No rounds yet — click + to add.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {rounds.map((r) => (
              <RoundItem key={r.id} round={r} flowId={flow.id} onEdit={handleEditRound} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
