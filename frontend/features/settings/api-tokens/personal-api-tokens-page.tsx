"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { PersonalTokensTab } from "./personal-tokens-tab";

export function PersonalApiTokensPage() {
  const canCreate = useCan("settings:api-tokens:write");
  const [createOpen, setCreateOpen] = useState(false);
  const handleCreate = useCallback(() => setCreateOpen(true), []);

  return (
    <PageWrapper
      title="Personal Access Tokens"
      subtitle="Create credentials that act only with your current, explicitly selected access."
      actions={
        canCreate ? (
          <AnimatedIconButton
            onClick={handleCreate}
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
          >
            New Token
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <PersonalTokensTab
        canCreate={canCreate}
        showCreate={createOpen}
        onShowCreateChange={setCreateOpen}
      />
    </PageWrapper>
  );
}
