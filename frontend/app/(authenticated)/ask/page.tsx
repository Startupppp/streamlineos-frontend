"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useWorkspaceSearch, useWorkspaceAsk } from "@/hooks/api/workspace-search";
import { SearchHitCard, WorkspaceAskPanel } from "@/features/workspace-search";

type ActiveTab = "search" | "ask";

const DEBOUNCE_MS = 300;

function SearchTab({ q }: { q: string }) {
  const { data, isPending, error } = useWorkspaceSearch({ q }, q.trim().length > 0);

  if (!q.trim()) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Enter a search query above to find content across your workspace.
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive text-center py-8">
        Failed to load results. Please try again.
      </p>
    );
  }

  if (!data || data.hits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No results found for &ldquo;{q}&rdquo;.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{data.total} result{data.total !== 1 ? "s" : ""}</p>
      <div className="space-y-2">
        {data.hits.map((hit, idx) => (
          <motion.div
            key={`${hit.entityType}:${hit.entityId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: idx * 0.05, ease: "easeOut" }}
          >
            <SearchHitCard hit={hit} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AskTab() {
  const [question, setQuestion] = React.useState("");
  const ask = useWorkspaceAsk();

  function handleAsk() {
    if (!question.trim()) return;
    ask.mutate({ q: question.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAsk();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Ask a question about your workspace..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Cmd+Enter to submit</p>
          <AnimatedIconButton
            icon={SparklesIcon}
            iconSize={14}
            size="sm"
            onClick={handleAsk}
            disabled={ask.isPending || !question.trim()}
          >
            Ask
          </AnimatedIconButton>
        </div>
      </div>
      <WorkspaceAskPanel
        data={ask.data}
        isPending={ask.isPending}
        error={ask.error}
      />
    </div>
  );
}

export default function AskPage() {
  const canUse = useCan("ai:search:use");
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("search");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(searchInput), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  if (!canUse) {
    return (
      <PageWrapper
        title="Ask StreamlineOS"
        subtitle="Search and ask questions across your workspace"
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">You don&apos;t have access to workspace search.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Ask StreamlineOS"
      subtitle="Search and ask questions across your workspace"
    >
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex gap-1 border-b border-border pb-0">
          {(["search", "ask"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "search" ? (
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask AI
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search projects, tickets, leads, deals..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            <SearchTab q={debouncedQ} />
          </div>
        )}

        {activeTab === "ask" && <AskTab />}
      </div>
    </PageWrapper>
  );
}
