"use client";

import type { ReactNode } from "react";
import { MailComposeProvider } from "@/features/mail/mail-compose-provider";

export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return <MailComposeProvider>{children}</MailComposeProvider>;
}
