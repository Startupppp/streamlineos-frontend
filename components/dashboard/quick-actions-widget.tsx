"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "@/components/ui/widget-card";
import { getQuickActionsForRole } from "@/features/dashboard/quick-actions";
import { Zap } from "lucide-react";
import Link from "next/link";

export function QuickActionsWidget() {
  const { data: session } = useSession();
  const actions = getQuickActionsForRole(session?.user?.role);

  return (
    <WidgetCard icon={Zap} title="Quick Actions">
      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-9 text-sm"
              asChild
            >
              <Link href={action.href} aria-label={action.label}>
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {action.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </WidgetCard>
  );
}
