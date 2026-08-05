"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { OrgTokensTab } from "./org-tokens-tab";

export function CrmApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const handleCreate = useCallback(() => setCreateOpen(true), []);

  return (
    <PageWrapper
      title="CRM API Keys"
      subtitle="Manage server credentials used to send leads into this CRM workspace."
      actions={
        <AnimatedIconButton
          onClick={handleCreate}
          icon={PlusIcon}
          iconSize={16}
          iconClassName="mr-1.5"
        >
          New API Key
        </AnimatedIconButton>
      }
    >
      <OrgTokensTab
        showCreate={createOpen}
        onShowCreateChange={setCreateOpen}
      />
    </PageWrapper>
  );
}
