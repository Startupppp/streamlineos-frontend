"use client";

import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessagingPanel } from "@/features/crm/shared/messaging-panel";
import { AiAssistantPanel } from "@/features/crm/shared/ai-assistant-panel";
import type { Contact } from "@/types/crm";

interface ContactQuickActionsProps {
  contact: Contact;
  onSendEmail: () => void;
  onLogCall: () => void;
}

export function ContactQuickActions({
  contact,
  onSendEmail,
  onLogCall,
}: ContactQuickActionsProps) {
  return (
    <div className="flex flex-col gap-gap-field">
      <div className="flex gap-gap-field">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onSendEmail}>
          <Mail className="h-3.5 w-3.5" />
          Send email
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onLogCall}>
          <Phone className="h-3.5 w-3.5" />
          Log call
        </Button>
      </div>
      <MessagingPanel phone={contact.phone} entityType="CONTACT" entityId={contact.id} />
      <AiAssistantPanel entityType="contact" entityId={contact.id} entityName={contact.name} />
    </div>
  );
}
