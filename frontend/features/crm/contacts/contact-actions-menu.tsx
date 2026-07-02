"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Link2,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import type { LeadEnrichmentResult } from "@/lib/ai/schemas";
import type { Contact } from "@/types/crm";

export function useEnrichContact() {
  return useMutation({
    mutationKey: ["contacts", "enrich"] as const,
    mutationFn: (input: {
      name: string;
      email?: string | null;
      company?: string | null;
    }) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", {
        name: input.name,
        email: input.email ?? undefined,
        company: input.company ?? undefined,
      }),
  });
}

export interface ContactActionsMenuProps {
  contact: Contact;
  isEnrichPending: boolean;
  onDelete: (id: number) => void;
  onEdit: (contact: Contact) => void;
  onEnrich: (contact: Contact) => void;
  triggerClassName?: string;
}

export function ContactActionsMenu({
  contact,
  isEnrichPending,
  onDelete,
  onEdit,
  onEnrich,
  triggerClassName,
}: ContactActionsMenuProps) {
  const router = useRouter();

  const handleView = useCallback(() => {
    router.push(`/crm/contacts/${contact.id}`);
  }, [contact.id, router]);

  const handleEdit = useCallback(() => {
    onEdit(contact);
  }, [contact, onEdit]);

  const handleEnrich = useCallback(() => {
    onEnrich(contact);
  }, [contact, onEnrich]);

  const handleDelete = useCallback(() => {
    onDelete(contact.id);
  }, [contact.id, onDelete]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", triggerClassName)}
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Link2 className="h-3.5 w-3.5 mr-2" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isEnrichPending} onClick={handleEnrich}>
          <Sparkles className="h-3.5 w-3.5 mr-2 text-blue-600" />
          Enrich with AI
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
