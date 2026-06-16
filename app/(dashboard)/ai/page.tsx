"use client";

import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AI_FEATURES, AI_CATEGORIES } from "@/features/ai/ai-features";
import { AiFeatureCard } from "@/features/ai/ai-feature-card";
import { AiFeatureForm } from "@/features/ai/ai-feature-form";
import type { AiFeature } from "@/features/ai/types";

export default function AIHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeFeature, setActiveFeature] = useState<AiFeature | null>(null);

  const filtered = useMemo(
    () =>
      selectedCategory === "all"
        ? AI_FEATURES
        : AI_FEATURES.filter((f) => f.category === selectedCategory),
    [selectedCategory],
  );

  return (
    <PageWrapper
      title="AI Hub"
      subtitle="Intelligent tools powered by AI to supercharge your workflow"
    >
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="h-auto w-full justify-start gap-1 rounded-lg p-1 flex-wrap">
          {AI_CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="whitespace-nowrap"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((feature) => (
              <AiFeatureCard
                key={feature.id}
                feature={feature}
                onClick={() => setActiveFeature(feature)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet
        open={!!activeFeature}
        onOpenChange={(open) => {
          if (!open) setActiveFeature(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] flex flex-col gap-0 p-0"
        >
          {activeFeature && (
            <>
              <SheetHeader className="px-6 py-4 border-b shrink-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <activeFeature.icon className="h-5 w-5 text-blue-600" />
                  {activeFeature.title}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <AiFeatureForm
                  featureId={activeFeature.id}
                  onClose={() => setActiveFeature(null)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
