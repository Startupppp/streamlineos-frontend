"use client";

import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Copy } from "lucide-react";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  duplicate: "outline",
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
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{item.title}</p>
              <Badge variant={STATUS_BADGE_VARIANT[item.status] ?? "outline"}>
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
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={handleAccept}>
                <Check className="h-3.5 w-3.5 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline}>
                <X className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDuplicate} aria-label="Mark as duplicate">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
