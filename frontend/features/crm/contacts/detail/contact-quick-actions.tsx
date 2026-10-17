"use client";

import { Download, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDownloadContactVcard } from "@/hooks/api/crm/contacts";
import { downloadBlob } from "@/lib/download-blob";
import { getErrorMessage } from "@/lib/get-error-message";
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
  const vcard = useDownloadContactVcard();

  function handleDownloadVcard() {
    vcard.mutate(contact.id, {
      onSuccess: (blob) => downloadBlob(blob, `${contact.name.trim() || "contact"}.vcf`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

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
      <LoadingButton variant="outline" size="sm" className="gap-1.5" isPending={vcard.isPending} onClick={handleDownloadVcard}>
        <Download className="h-3.5 w-3.5" />
        Download vCard
      </LoadingButton>
      <MessagingPanel phone={contact.phone} entityType="CONTACT" entityId={contact.id} />
      <AiAssistantPanel entityType="contact" entityId={contact.id} entityName={contact.name} />
    </div>
  );
}
