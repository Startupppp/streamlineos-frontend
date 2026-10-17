"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { RostersGrid } from "./rosters-grid";
import { CreateRosterSheet } from "./create-roster-sheet";

export function RostersPage() {
  const canManage = useCan("hr:attendance:manage");
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  return (
    <PageWrapper
      title="Rosters"
      subtitle="Weekly scheduling grid for your team"
      actions={
        canManage ? (
          <Button size="sm" onClick={handleOpen}>
            <Plus className="h-4 w-4" />
            New roster
          </Button>
        ) : undefined
      }
    >
      <div>
        <RostersGrid canManage={canManage} />
      </div>
      <CreateRosterSheet open={open} onOpenChange={setOpen} />
    </PageWrapper>
  );
}
