import { AppSidebar } from "../../components/layout/app-sidebar";
import { AssistantBot } from "../../components/ai/assistant-bot";
import { DashboardHeader } from "../../components/layout/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative bg-background">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] border-r bg-sidebar">
        <AppSidebar />
      </div>
      <main className="md:pl-72 h-full flex flex-col">
        <DashboardHeader />
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
      <AssistantBot />
    </div>
  );
}
