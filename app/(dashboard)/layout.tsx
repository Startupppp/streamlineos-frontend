import { AppSidebar } from "../../components/layout/app-sidebar";
import { AssistantBot } from "../../components/ai/assistant-bot";
import { DashboardHeader } from "../../components/layout/dashboard-header";
import { OrganizationGuard } from "../../components/auth/organization-guard";
import { ScrollArea } from "../../components/ui/scroll-area";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrganizationGuard>
      <div className="h-screen relative bg-background overflow-hidden">
        <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 border-r bg-sidebar">
          <AppSidebar />
        </div>
        <main className="md:pl-72 h-screen flex flex-col overflow-hidden">
          <DashboardHeader />
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="p-4 md:p-8">
                {children}
              </div>
            </ScrollArea>
          </div>
        </main>
        <AssistantBot />
      </div>
    </OrganizationGuard>
  );
}
