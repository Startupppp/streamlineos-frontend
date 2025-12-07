// import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        {/* Placeholder cards */}
        <div className="p-6 bg-card rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Total Employees</h3>
            <p className="text-2xl font-bold mt-2">124</p>
        </div>
        <div className="p-6 bg-card rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Projects Active</h3>
            <p className="text-2xl font-bold mt-2">12</p>
        </div>
          <div className="p-6 bg-card rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Pending Leaves</h3>
            <p className="text-2xl font-bold mt-2 text-yellow-600">8</p>
        </div>
          <div className="p-6 bg-card rounded-xl border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Payroll Status</h3>
            <p className="text-2xl font-bold mt-2 text-green-600">Processed</p>
        </div>
      </div>
    </div>
  );
}
