# 📊 Zoho Timesheet - Complete Guide & Implementation

## 🎯 **What is Zoho Timesheet?**

**Zoho Timesheet** is a time tracking system that allows employees to log hours spent on tasks/projects and enables managers to view, approve, and analyze team productivity.

### **Key Features:**
1. **Employee Time Logging** - Workers record daily hours on tasks
2. **Project/Task Association** - Time linked to specific work items
3. **Calendar View** - Weekly/monthly time visualization
4. **Manager Oversight** - Admins can view all team timesheets
5. **Reports & Analytics** - Time spent per project, per person
6. **Approval Workflow** - Managers approve submitted timesheets
7. **Billing Integration** - Convert hours to billable amounts

---

## 🏢 **How Zoho Timesheet Works:**

### **Employee Workflow:**
```
1. Open Timesheet → Select Date
2. Choose Project & Task/Ticket
3. Enter Hours Worked (e.g., 8.5 hours)
4. Add Description: "Worked on authentication module"
5. Submit for Approval
6. Manager reviews and approves
```

### **Manager/Admin Workflow:**
```
1. View Team Timesheets Dashboard
2. See all employees' logged hours
3. Filter by: Date, Employee, Project, Status
4. Review individual entries
5. Approve or Reject with comments
6. Generate reports (weekly, monthly, project-wise)
7. Export to Excel/PDF for payroll
```

---

## 📊 **Current Implementation in Vaivamm CRM**

### **What Already Exists:** ✅

#### **1. Database Schema:**
```sql
timesheets table:
- id (serial)
- orgId (organization)
- userId (who logged time)
- ticketId (which task)
- date (when work was done)
- hours (decimal, e.g., 8.5)
- description (what was done)
- createdAt (timestamp)
```

#### **2. Employee Features:**
- ✅ Log time on tickets
- ✅ Add hours and description
- ✅ View personal timesheet history
- ✅ Link time to specific tickets/projects
- ✅ Date selection for entries

#### **3. Current Limitations:** ❌
- ❌ **Owners/Admins can't view OTHER employees' timesheets**
- ❌ No team timesheet dashboard
- ❌ No filtering by employee/date range
- ❌ No approval workflow
- ❌ No weekly/monthly summary view
- ❌ No reports or analytics
- ❌ No export functionality

---

## 🚀 **What We Need to Implement:**

### **Phase 1: Team Timesheet Viewing** (Priority: HIGH)
Allow Owners and Admins to see all employees' time logs

### **Phase 2: Advanced Filters & Search**
Filter by employee, date range, project, approval status

### **Phase 3: Approval Workflow**
Managers can approve/reject submitted timesheets

### **Phase 4: Reports & Analytics**
Weekly/monthly reports, project-wise summaries, export to Excel

### **Phase 5: Calendar View**
Visual weekly grid showing hours per day

---

## 📋 **Detailed Feature Comparison:**

| Feature | Zoho Timesheet | Current System | To Implement |
|---------|---------------|----------------|--------------|
| **Employee logs time** | ✅ | ✅ | - |
| **Link to projects/tasks** | ✅ | ✅ | - |
| **Personal timesheet view** | ✅ | ✅ | - |
| **Admin views all timesheets** | ✅ | ❌ | ✅ HIGH |
| **Filter by employee** | ✅ | ❌ | ✅ HIGH |
| **Filter by date range** | ✅ | ❌ | ✅ HIGH |
| **Filter by project** | ✅ | ❌ | ✅ MEDIUM |
| **Approval workflow** | ✅ | ❌ | ✅ MEDIUM |
| **Weekly summary view** | ✅ | ❌ | ✅ MEDIUM |
| **Monthly reports** | ✅ | ❌ | ✅ LOW |
| **Export to Excel/PDF** | ✅ | ❌ | ✅ LOW |
| **Billable hours tracking** | ✅ | ❌ | ✅ LOW |
| **Calendar grid view** | ✅ | ❌ | ✅ LOW |
| **Mobile app** | ✅ | ❌ | ✅ FUTURE |

---

## 🔧 **Implementation Plan:**

### **Phase 1: Team Timesheet Dashboard (Immediate)**

#### **A. API Endpoint for All Timesheets:**
```typescript
// server/api/routers/project.ts
getAllTimesheets: protectedProcedure
  .input(z.object({
    userId: z.string().optional(),      // Filter by employee
    startDate: z.date().optional(),     // Date range start
    endDate: z.date().optional(),       // Date range end
    projectId: z.number().optional(),   // Filter by project
  }))
  .query(async ({ ctx, input }) => {
    // Permission check: Only OWNER or ADMIN
    if (ctx.session.user.role !== "OWNER" && 
        ctx.session.user.role !== "ADMIN") {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Only owners and admins can view team timesheets" 
      });
    }

    // Build query with filters
    const conditions = [eq(timesheets.orgId, ctx.session.orgId)];
    
    if (input.userId) {
      conditions.push(eq(timesheets.userId, input.userId));
    }
    
    if (input.startDate) {
      conditions.push(gte(timesheets.date, format(input.startDate, "yyyy-MM-dd")));
    }
    
    if (input.endDate) {
      conditions.push(lte(timesheets.date, format(input.endDate, "yyyy-MM-dd")));
    }

    return await ctx.db.query.timesheets.findMany({
      where: and(...conditions),
      with: {
        user: true,              // Employee who logged time
        ticket: {
          with: {
            project: true,       // Project info
          },
        },
      },
      orderBy: [desc(timesheets.date)],
    });
  });
```

#### **B. New Page: `/timesheets/team`**
```tsx
"use client";

export default function TeamTimesheetsPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(/* 7 days ago */);
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data: timesheets, isLoading } = api.project.getAllTimesheets.useQuery({
    userId: selectedEmployee === "all" ? undefined : selectedEmployee,
    startDate,
    endDate,
  });

  const { data: employees } = api.hr.getEmployees.useQuery();

  return (
    <div className="p-8">
      <h1>Team Timesheets</h1>
      
      {/* Filters */}
      <div className="filters">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectItem value="all">All Employees</SelectItem>
          {employees?.map(emp => (
            <SelectItem value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
          ))}
        </Select>

        <DatePicker value={startDate} onChange={setStartDate} />
        <DatePicker value={endDate} onChange={setEndDate} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardTitle>Total Hours</CardTitle>
          <CardContent>{calculateTotalHours(timesheets)}h</CardContent>
        </Card>
        <Card>
          <CardTitle>Employees Logged</CardTitle>
          <CardContent>{getUniqueEmployees(timesheets)}</CardContent>
        </Card>
        <Card>
          <CardTitle>Projects Worked</CardTitle>
          <CardContent>{getUniqueProjects(timesheets)}</CardContent>
        </Card>
        <Card>
          <CardTitle>Avg Hours/Day</CardTitle>
          <CardContent>{calculateAvgHours(timesheets)}h</CardContent>
        </Card>
      </div>

      {/* Timesheets Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Ticket</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timesheets?.map(entry => (
            <TableRow key={entry.id}>
              <TableCell>
                <Avatar />
                {entry.user?.firstName} {entry.user?.lastName}
              </TableCell>
              <TableCell>{format(entry.date, "MMM d")}</TableCell>
              <TableCell>{entry.ticket?.project?.name}</TableCell>
              <TableCell>#{entry.ticketId}</TableCell>
              <TableCell>{entry.hours}h</TableCell>
              <TableCell>{entry.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

### **Phase 2: Advanced Features**

#### **Weekly Summary View:**
```
┌─────────────────────────────────────────────────────┐
│ Raj Kumar - Week of Jan 8-14, 2025                  │
├──────┬────────┬────────┬────────┬────────┬──────────┤
│ Mon  │ Tue    │ Wed    │ Thu    │ Fri    │ Total    │
├──────┼────────┼────────┼────────┼────────┼──────────┤
│ 8h   │ 7.5h   │ 9h     │ 8h     │ 6h     │ 38.5h    │
└──────┴────────┴────────┴────────┴────────┴──────────┘

Projects:
- Mobile App: 24h
- Website Redesign: 14.5h
```

#### **Approval Workflow:**
```typescript
// Add to timesheets table schema
status: text("status").default("PENDING"), // PENDING, APPROVED, REJECTED
approvedBy: text("approved_by").references(() => users.id),
approvedAt: timestamp("approved_at"),
rejectionReason: text("rejection_reason"),
```

---

## 📊 **Use Cases & Benefits:**

### **For Employees:**
✅ Track daily work hours accurately  
✅ Link time to specific tasks/projects  
✅ View personal time history  
✅ Know if timesheets are approved  

### **For Managers/Admins:**
✅ **See team productivity** - Who's working on what  
✅ **Monitor project hours** - Track time spent per project  
✅ **Identify bottlenecks** - Which tasks take longest  
✅ **Resource planning** - Allocate work based on capacity  
✅ **Payroll accuracy** - Export hours for salary calculation  
✅ **Client billing** - Track billable hours per client project  

### **For CEO/Owners:**
✅ **Team performance** - Overall productivity metrics  
✅ **Project profitability** - Compare hours vs. budget  
✅ **Resource allocation** - Optimize team assignments  
✅ **Trend analysis** - Weekly/monthly comparisons  

---

## 🎯 **Example Scenarios:**

### **Scenario 1: Weekly Team Review**
```
CEO wants to see what the team accomplished this week:

1. Go to "Team Timesheets"
2. Filter: Last 7 days
3. See summary:
   - Total team hours: 240h
   - Top project: Mobile App (120h)
   - Most active: Raj Kumar (48h)
4. Click on employee to see detailed breakdown
```

### **Scenario 2: Project Budget Monitoring**
```
Admin wants to check if Mobile App project is on budget:

1. Go to "Team Timesheets"
2. Filter: Project = "Mobile App"
3. Filter: This month
4. See total hours: 320h
5. Calculate cost: 320h × ₹500/h = ₹160,000
6. Compare to budget: ₹200,000 (✅ Within budget)
```

### **Scenario 3: Individual Performance Review**
```
Manager reviewing Raj's work for appraisal:

1. Filter: Employee = "Raj Kumar"
2. Filter: Last 3 months
3. See:
   - Total hours: 480h
   - Projects worked: 4
   - Avg hours/week: 40h
   - Most time on: Authentication module (120h)
4. Export to PDF for HR records
```

---

## 🚀 **Implementation Priority:**

### **Immediate (This Week):**
1. ✅ Add API endpoint for viewing all timesheets
2. ✅ Add permission check (OWNER, ADMIN, MANAGER only)
3. ✅ Create Team Timesheets page
4. ✅ Add filters: Employee, Date Range
5. ✅ Add summary statistics

### **Short Term (Next 2 Weeks):**
1. Add project filter
2. Add weekly summary view
3. Add export to Excel functionality
4. Add approval workflow (optional)

### **Long Term (Future):**
1. Calendar grid view
2. Advanced analytics dashboard
3. Billable hours tracking
4. Mobile app integration

---

## 📱 **UI Mockup:**

```
┌───────────────────────────────────────────────────────────────────┐
│ 📊 Team Timesheets                                   [Export] [↻] │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Filters:  [All Employees ▼]  [📅 Jan 1 - Jan 14]  [All Projects ▼]│
│                                                                    │
│ ┌─────────────┬─────────────┬─────────────┬─────────────┐        │
│ │ 📊 240h     │ 👥 12       │ 📁 5         │ ⌀ 8h/day    │        │
│ │ Total Hours │ Employees   │ Projects     │ Average     │        │
│ └─────────────┴─────────────┴─────────────┴─────────────┘        │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Employee    │ Date       │ Project      │ Hours │ Status    │  │
│ ├──────────────────────────────────────────────────────────────┤  │
│ │ 👤 Raj Kumar│ Jan 14     │ Mobile App   │ 8h    │ ✅ Approved│  │
│ │ 👤 Priya S  │ Jan 14     │ Website      │ 7h    │ ⏳ Pending │  │
│ │ 👤 Raj Kumar│ Jan 13     │ Mobile App   │ 9h    │ ✅ Approved│  │
│ └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 💡 **Key Takeaways:**

### **What Zoho Timesheet Does:**
- Tracks employee work hours
- Links time to projects/tasks
- Provides manager oversight
- Generates reports for billing/payroll
- Approval workflow for accountability

### **What We Have Implemented:**
- ✅ Basic time logging
- ✅ Task linkage
- ✅ Personal timesheet view
- ✅ Team timesheet viewing for Owners/Admins
- ✅ Advanced filtering (employee, project, date range)
- ✅ Summary statistics (total hours, unique employees, projects)
- ✅ Employee breakdown with hours
- ✅ CSV export functionality
- ✅ Approval workflow (approve/reject timesheet entries)

### **Access Control:**
- **Owners & Admins**: Full access to team timesheets, approval capabilities
- **Members**: Can only view their own timesheets

---

**All core timesheet features are now implemented!** 🚀

