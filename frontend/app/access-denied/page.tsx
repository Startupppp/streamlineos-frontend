import Link from "next/link";
import { ShieldAlert, Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AccessDeniedPageProps {
  searchParams: Promise<{ required?: string; from?: string }>;
}

export const metadata = { title: "Access Denied | StreamlineOS" };

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { required, from } = await searchParams;
  const requiredList = required ? required.split(",").filter(Boolean) : [];

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Card className="max-w-md w-full border-slate-200/80 shadow-[0_18px_44px_-18px_rgba(30,64,175,0.18)]">
        <CardContent className="p-8 sm:p-10 text-center space-y-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-red-50 ring-1 ring-red-200/60 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-red-500" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
              You don&apos;t have access to this screen
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your account doesn&apos;t have the permissions needed for this area.
              Ask your organization owner or admin to grant access.
            </p>
          </div>

          {(requiredList.length > 0 || from) && (
            <div className="rounded-lg border border-slate-200/70 bg-slate-50/60 px-4 py-3 text-left space-y-2">
              {from && (
                <div>
                  <p className="text-[11px] font-medium text-blue-600 mb-1 leading-none">
                    You tried to open
                  </p>
                  <p className="font-mono text-xs text-slate-700 break-all">{from}</p>
                </div>
              )}
              {requiredList.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-blue-600 mb-1 leading-none">
                    Required permission{requiredList.length > 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-0.5">
                    {requiredList.map((p) => (
                      <li key={p} className="font-mono text-xs text-slate-700">
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
  );
}
