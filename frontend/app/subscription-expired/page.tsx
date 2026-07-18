import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscriptionExpiredPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Subscription Inactive
        </h1>
        <p className="mb-8 text-muted-foreground">
          Your organization&apos;s subscription has expired or been cancelled. Please contact
          your administrator to renew access.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/billing?tab=plan">Renew Subscription</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signin">Sign in with another account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
