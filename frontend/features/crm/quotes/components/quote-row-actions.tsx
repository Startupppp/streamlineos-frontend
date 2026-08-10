"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, Send, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { QuoteListItem, QuoteStatus } from "@/types/crm/quotes";

interface QuoteRowActionsProps {
  quote: QuoteListItem;
  onDelete: (id: number) => void;
  onStatusUpdate: (id: number, status: QuoteStatus) => void;
}

export function QuoteRowActions({
  quote,
  onDelete,
  onStatusUpdate,
}: QuoteRowActionsProps) {
  const router = useRouter();

  const handleView = useCallback(() => {
    router.push(`/crm/quotes/${quote.id}`);
  }, [quote.id, router]);

  const handleSend = useCallback(() => {
    onStatusUpdate(quote.id, "SENT");
  }, [quote.id, onStatusUpdate]);

  const handleAccept = useCallback(() => {
    onStatusUpdate(quote.id, "ACCEPTED");
  }, [quote.id, onStatusUpdate]);

  const handleReject = useCallback(() => {
    onStatusUpdate(quote.id, "REJECTED");
  }, [quote.id, onStatusUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(quote.id);
  }, [quote.id, onDelete]);

  const canSend = quote.status === "DRAFT";
  const canAcceptOrReject = quote.status === "SENT";
  const canDelete = quote.status === "DRAFT";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton
          icon={EllipsisIcon}
          iconSize={16}
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="More options"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Eye className="h-3.5 w-3.5 mr-2" />
          View Details
        </DropdownMenuItem>
        {canSend && (
          <DropdownMenuItem onClick={handleSend}>
            <Send className="h-3.5 w-3.5 mr-2 text-primary" />
            Send Quote
          </DropdownMenuItem>
        )}
        {canAcceptOrReject && (
          <>
            <DropdownMenuItem onClick={handleAccept}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
              Accept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReject}>
              <XCircle className="h-3.5 w-3.5 mr-2 text-destructive" />
              Reject
            </DropdownMenuItem>
          </>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
