"use client";

import { useState, useCallback } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import type { EmailTemplatePreview } from "./template-registry";

interface TemplateFormSheetProps {
  selectedTemplate: EmailTemplatePreview | null;
}

export function TemplateFormSheet({ selectedTemplate }: TemplateFormSheetProps) {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleTestEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTestEmail(e.target.value);
  }, []);

  const handleSendTest = useCallback(async () => {
    if (!selectedTemplate || !testEmail.trim()) {
      toast.error("Select a template and enter a test email address");
      return;
    }
    setSending(true);
    try {
      await apiClient.post("/settings/email-templates/test", {
        templateId: selectedTemplate.id,
        testEmail: testEmail.trim(),
      });
      toast.success(`Test email sent to ${testEmail}`);
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setSending(false);
    }
  }, [selectedTemplate, testEmail]);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        placeholder="your@email.com"
        className="h-8 w-52 text-sm"
        value={testEmail}
        onChange={handleTestEmailChange}
        aria-label="Test email address"
      />
      <Button
        size="sm"
        onClick={handleSendTest}
        disabled={sending || !selectedTemplate || !testEmail.trim()}
      >
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {sending ? "Sending…" : "Send Test"}
      </Button>
    </div>
  );
}
