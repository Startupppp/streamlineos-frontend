"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, Send, CheckCircle2, XCircle, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Eye className="h-3.5 w-3.5 mr-2" />
          View Details
        </DropdownMenuItem>
        {canSend && (
          <DropdownMenuItem onClick={handleSend}>
            <Send className="h-3.5 w-3.5 mr-2 text-blue-600" />
            Send Quote
          </DropdownMenuItem>
        )}
        {canAcceptOrReject && (
          <>
            <DropdownMenuItem onClick={handleAccept}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
              Accept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReject}>
              <XCircle className="h-3.5 w-3.5 mr-2 text-red-600" />
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
