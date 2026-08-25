import { headers } from "next/headers";
import Link from "next/link";
import { ShieldAlert, Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppThemeScript } from "@/components/theme/app-theme-script";
import { AppThemeProvider } from "@/components/theme/app-theme-provider";

interface AccessDeniedPageProps {
  searchParams: Promise<{ required?: string; from?: string }>;
}

export const metadata = { title: "Access Denied | StreamlineOS" };

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { required, from } = await searchParams;
  const requiredList = required ? required.split(",").filter(Boolean) : [];
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  /**
   * The theme is mounted here, not inherited.
   *
   * This page sits at the root of `app/`, outside the `(authenticated)` group —
   * so it never saw `AppThemeProvider` or the pre-hydration `AppThemeScript`,
   * and rendered fully light for a viewer in dark mode. It is only ever shown
   * to somebody signed in, hitting a screen they lack the permission for, so a
   * full-brightness flash is exactly the wrong moment for one.
   */
  return (
    <AppThemeProvider>
      <AppThemeScript nonce={nonce} />
    <div className="min-h-dvh w-full flex items-center justify-center p-6 bg-gradient-to-br from-gradient-neutral-wash-from via-background to-gradient-info-wash-to">
      <Card className="max-w-md w-full border-border shadow-accent">
        <CardContent className="p-8 sm:p-10 text-center space-y-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-status-danger-surface ring-1 ring-status-danger-rule flex items-center justify-center">
            <ShieldAlert className="w-7 text-status-danger-ink" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground">
              You don&apos;t have access to this screen
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account doesn&apos;t have the permissions needed for this area.
              Ask your organization owner or admin to grant access.
            </p>
          </div>

          {(requiredList.length > 0 || from) && (
            <div className="rounded-lg border border-border bg-muted px-4 py-3 text-left space-y-2">
              {from && (
                <div>
                  <p className="text-dense font-medium text-status-info-ink mb-1 leading-none">
                    You tried to open
                  </p>
                  <p className="font-mono text-xs text-foreground break-all">{from}</p>
                </div>
              )}
              {requiredList.length > 0 && (
                <div>
                  <p className="text-dense font-medium text-status-info-ink mb-1 leading-none">
                    Required permission{requiredList.length > 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-0.5">
                    {requiredList.map((p) => (
                      <li key={p} className="font-mono text-xs text-foreground">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-1.5" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/support">
                <Mail className="h-4 w-4 mr-1.5" />
                Request access
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </AppThemeProvider>
  );
}
