import type { z } from "zod";
import type {
  ticketWithRelationsContract,
  supportTicketDetailContract,
  createTicketContract,
  supportTicketMessageContract,
} from "@/hooks/api/support/support-ticket-schema";

export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SupportMessageAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export type SupportMessage = z.infer<typeof supportTicketMessageContract>;

export type SupportTicket = z.infer<typeof ticketWithRelationsContract> &
  Partial<Pick<z.infer<typeof supportTicketDetailContract>, "messages" | "customFieldValues">> &
  Partial<Pick<z.infer<typeof createTicketContract>, "possibleDuplicateOf">>;
