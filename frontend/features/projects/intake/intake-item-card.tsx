"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Copy } from "lucide-react";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  duplicate: "outline",
};

const STATUS_LEFT_COLOR: Record<string, string> = {
  pending: "bg-amber-400",
  accepted: "bg-emerald-500",
  declined: "bg-red-500",
  duplicate: "bg-slate-300",
};

interface IntakeItem {
  id: number;
  title: string;
  description?: unknown;
  status: string;
  createdAt?: string | Date | null;
  submitterEmail?: string | null;
  declineReason?: string | null;
}

interface IntakeItemCardProps {
  item: IntakeItem;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  onDuplicate: (id: number) => void;
}

export function IntakeItemCard({ item, onAccept, onDecline, onDuplicate }: IntakeItemCardProps) {
  const handleAccept = useCallback(() => onAccept(item.id), [item.id, onAccept]);
  const handleDecline = useCallback(() => onDecline(item.id), [item.id, onDecline]);
  const handleDuplicate = useCallback(() => onDuplicate(item.id), [item.id, onDuplicate]);

  return (
    <div className="flex overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all">
      <div className={cn("w-1 shrink-0", STATUS_LEFT_COLOR[item.status] ?? "bg-slate-300")} />
      <div className="flex-1 py-3 px-4 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold truncate text-sm">{item.title}</p>
          <Badge
            variant={STATUS_BADGE_VARIANT[item.status] ?? "outline"}
            className="text-xs font-medium px-1.5 py-0.5 rounded-md"
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        </div>
        {item.description != null && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {typeof item.description === "string" ? item.description : JSON.stringify(item.description)}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
          {item.submitterEmail && ` by ${item.submitterEmail}`}
        </p>
        {item.declineReason && (
          <p className="text-xs text-destructive mt-1">Reason: {item.declineReason}</p>
        )}
      </div>
      {item.status === "pending" && (
        <div className="flex items-center gap-1 shrink-0 py-3 pr-3">
          <Button
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm text-xs h-7"
            onClick={handleAccept}
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Accept
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleDecline}>
            <X className="h-3.5 w-3.5 mr-1" /> Decline
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7" onClick={handleDuplicate} aria-label="Mark as duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
