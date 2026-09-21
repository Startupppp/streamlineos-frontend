"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { BiometricDevicesList } from "./biometric-devices-list";
import { BiometricLogsList } from "./biometric-logs-list";
import { AddDeviceSheet } from "./add-device-sheet";
import type { BiometricDevice } from "@/hooks/api/hr/biometric";

export function BiometricPage() {
  const canManage = useCan("hr:attendance:manage");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BiometricDevice | null>(null);

  function handleOpen() {
    setEditing(null);
    setOpen(true);
  }

  function handleEdit(device: BiometricDevice) {
    setEditing(device);
    setOpen(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setEditing(null);
  }

  return (
    <PageWrapper
      title="Biometric Integration"
      subtitle="Manage fingerprint/face-recognition devices and attendance sync"
      actions={
        canManage ? (
          <Button onClick={handleOpen}>
            <Plus className="h-4 w-4 mr-2" />
            Register device
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex flex-1 min-h-0 flex-col"
      >
        <Tabs defaultValue="devices" className="flex flex-1 min-h-0 flex-col gap-4">
          <TabsList>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="logs">Punch Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="devices" className="mt-0 flex flex-1 min-h-0 flex-col">
            <BiometricDevicesList canManage={canManage} onEdit={handleEdit} />
          </TabsContent>
          <TabsContent value="logs" className="mt-0 flex flex-1 min-h-0 flex-col">
            <BiometricLogsList />
          </TabsContent>
        </Tabs>
      </motion.div>
      <AddDeviceSheet open={open} onOpenChange={handleOpenChange} device={editing} />
    </PageWrapper>
  );
}
