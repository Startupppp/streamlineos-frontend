"use client";

import { AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CyclesTab } from "@/features/hr/feedback/cycles-tab";
import { MyReviewsTab } from "@/features/hr/feedback/my-reviews-tab";
import { ResultsTab } from "@/features/hr/feedback/results-tab";

export default function FeedbackPage() {
  return (
    <PageWrapper title="360° Feedback" subtitle="Manage feedback cycles and review submissions" variant="display">
      <Tabs defaultValue="cycles">
        <TabsList className="bg-card/80 border-border/80">
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="reviews">My Reviews</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="cycles" className="mt-6">
            <CyclesTab />
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <MyReviewsTab />
          </TabsContent>
          <TabsContent value="results" className="mt-6">
            <ResultsTab />
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </PageWrapper>
  );
}
