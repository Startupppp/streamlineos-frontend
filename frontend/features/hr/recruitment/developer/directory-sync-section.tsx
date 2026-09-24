"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDirectorySyncState } from "@/hooks/api/hr/recruitment/developer-sandbox";

/**
 * What enterprise sign-on and directory sync actually do here, said on the
 * screen where an administrator would go looking for the switch.
 *
 * Both are blocked and both say so. The specific harm this replaces: an admin
 * who reads "SSO supported" believes that removing a leaver from their IdP
 * removes that person's access to candidate data here. It does not — the only
 * federated sign-in is Google, which authenticates a Google account rather than
 * a directory — and finding that out during an audit is expensive.
 */
export function DirectorySyncSection() {
  const { data: entries = [], isLoading } = useDirectorySyncState();

  if (isLoading || entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Sign-on and directory</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <Card key={entry.capability} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">{entry.capability}</CardTitle>
                <Badge variant="outline" className="text-micro">
                  Not available
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-xs text-muted-foreground">
              <p>{entry.provider.message}</p>
              <p>
                <span className="font-medium text-foreground">Today: </span>
                {entry.availableToday}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
