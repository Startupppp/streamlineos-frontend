"use client";

import { useCallback } from "react";
import { MessageCircle, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateTask } from "@/hooks/api/tasks";
import type { TaskEntityType } from "@/hooks/api/tasks";

interface MessagingPanelProps {
  phone: string | null | undefined;
  entityType: TaskEntityType;
  entityId: number;
}

export function MessagingPanel({ phone, entityType, entityId }: MessagingPanelProps) {
  const createTask = useCreateTask();

  const handleWhatsApp = useCallback(() => {
    if (!phone) return;
    const digits = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
    createTask.mutate({
      title: "WhatsApp message sent",
      type: "CUSTOM",
      notes: `WhatsApp message sent to ${phone}`,
      entityType,
      entityId,
    });
    toast.success("WhatsApp opened and activity logged");
  }, [phone, entityType, entityId, createTask]);

  const handleSms = useCallback(() => {
    if (!phone) return;
    window.location.href = `sms:${phone}`;
    createTask.mutate({
      title: "SMS sent",
      type: "CUSTOM",
      notes: `SMS sent to ${phone}`,
      entityType,
      entityId,
    });
    toast.success("SMS app opened and activity logged");
  }, [phone, entityType, entityId, createTask]);

  if (!phone) {
    return (
      <p className="text-xs text-muted-foreground">No phone number on record</p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsApp}
          className="gap-1.5 text-xs"
        >
          <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
          WhatsApp
        </Button>
      </motion.div>
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSms}
          className="gap-1.5 text-xs"
        >
          <Smartphone className="h-3.5 w-3.5 text-blue-500" />
          SMS
        </Button>
      </motion.div>
    </div>
  );
}
