"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { User, Palette, Bell, Shield } from "lucide-react";
import { SettingsProfile } from "./_components/settings-profile";
import { SettingsAppearance } from "./_components/settings-appearance";
import { SettingsNotifications } from "./_components/settings-notifications";
import { SettingsSecurity } from "./_components/settings-security";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and settings."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <SettingsProfile />
        </TabsContent>

        <TabsContent value="appearance">
          <SettingsAppearance />
        </TabsContent>

        <TabsContent value="notifications">
          <SettingsNotifications />
        </TabsContent>

        <TabsContent value="security">
          <SettingsSecurity />
        </TabsContent>
      </Tabs>
    </div>
  );
}
