"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { BiometricDevicesList } from "@/features/hr/biometric/biometric-devices-list";
import { BiometricLogsList } from "@/features/hr/biometric/biometric-logs-list";
import { AddDeviceSheet } from "@/features/hr/biometric/add-device-sheet";
import type { BiometricDevice } from "@/hooks/api/hr/biometric";

export default function BiometricPage() {
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
            Add Device
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs defaultValue="devices">
          <TabsList className="mb-4">
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="logs">Punch Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="devices">
            <BiometricDevicesList canManage={canManage} onEdit={handleEdit} />
          </TabsContent>
          <TabsContent value="logs">
            <BiometricLogsList />
          </TabsContent>
        </Tabs>
      </motion.div>
      <AddDeviceSheet open={open} onOpenChange={handleOpenChange} device={editing} />
    </PageWrapper>
  );
}
