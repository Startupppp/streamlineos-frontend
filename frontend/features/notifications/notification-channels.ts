import type { NotificationChannel } from "@/types/notifications";

export interface NotificationChannelOption {
  value: NotificationChannel;
  label: string;
}

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "In-App",
  EMAIL: "Email",
  PUSH: "Push",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  WEBHOOK: "Webhook",
};

const CHANNEL_ORDER: readonly NotificationChannel[] = [
  "IN_APP",
  "EMAIL",
  "PUSH",
  "SMS",
  "WHATSAPP",
  "WEBHOOK",
];

export const NOTIFICATION_CHANNELS: readonly NotificationChannelOption[] =
  CHANNEL_ORDER.map((value) => ({ value, label: CHANNEL_LABELS[value] }));
