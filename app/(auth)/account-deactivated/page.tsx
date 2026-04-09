import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function AccountDeactivatedPage() {
  return (
    <div className="w-full max-w-md animate-fade-up text-center">
      <div className="mx-auto mb-5 h-14 w-14 flex items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldOff className="h-7 w-7 text-destructive" />
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
        Account Deactivated
      </h1>

      <p className="mt-3 text-sm text-muted-foreground">
        Your account has been deactivated. Please contact your administrator
        to restore access.
      </p>

      <Link
        href="/signin"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
      >
        Back to Sign In
      </Link>
    </div>
  );
}
