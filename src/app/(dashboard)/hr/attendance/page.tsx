import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyLog } from "@/components/attendance/monthly-log";
import { DailyLog } from "@/components/attendance/daily-log";

export default function AttendancePage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Attendance</h2>
        <p className="text-zinc-400">View and manage attendance logs.</p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger 
            value="daily"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-zinc-400"
          >
            Daily Log
          </TabsTrigger>
          <TabsTrigger 
            value="monthly" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-zinc-400"
          >
            Monthly Log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-6">
            <DailyLog />
        </TabsContent>
        <TabsContent value="monthly" className="mt-6">
          <div className="space-y-4">
            <MonthlyLog />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
