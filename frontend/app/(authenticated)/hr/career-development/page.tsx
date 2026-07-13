"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { CareerPathsList } from "@/features/hr/career/career-paths-list";
import { CreatePathSheet } from "@/features/hr/career/create-path-sheet";
import { MyCareerPlan } from "@/features/hr/career/my-career-plan";
import { MentorshipTab } from "@/features/hr/career/mentorship-tab";

export default function CareerDevelopmentPage() {
  const canManage = useCan("hr:learning:manage");
  const [tab, setTab] = useState("paths");
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  return (
    <PageWrapper
      title="Career Development"
      subtitle="Grow with structured paths and milestones"
      actions={
        canManage && tab === "paths" ? (
          <Button
            onClick={handleOpenSheet}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Path
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="paths">Career Paths</TabsTrigger>
            <TabsTrigger value="plan">My Career Plan</TabsTrigger>
            <TabsTrigger value="mentorship">Mentorship</TabsTrigger>
          </TabsList>
          <TabsContent value="paths">
            <CareerPathsList canManage={canManage} />
          </TabsContent>
          <TabsContent value="plan">
            <MyCareerPlan />
          </TabsContent>
          <TabsContent value="mentorship">
            <MentorshipTab />
          </TabsContent>
        </Tabs>
      </motion.div>
      <CreatePathSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
