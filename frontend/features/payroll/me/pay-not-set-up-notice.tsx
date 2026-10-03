"use client";

import { Wallet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useT } from "@/lib/i18n/i18n";

export function PayNotSetUpNotice() {
  const t = useT();
  return (
    <Alert data-testid="pay-not-set-up">
      <Wallet />
      <AlertTitle>{t("pay.notSetUpTitle")}</AlertTitle>
      <AlertDescription>{t("pay.notSetUpBody")}</AlertDescription>
    </Alert>
  );
}
