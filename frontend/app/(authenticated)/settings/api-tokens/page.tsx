"use client";

import { Key } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";

export default function ApiTokensPage() {
  return (
    <PageWrapper
      title="API Tokens"
      subtitle="Create and manage personal API tokens for programmatic access."
    >
      <div className="max-w-lg">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Key className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">API Tokens coming soon</p>
            <p className="text-xs text-center max-w-xs">
              Personal API tokens will be available in a future release. Check back soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
