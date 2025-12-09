import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tickets, projects, attendance, leaveRequests, payrolls } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { format } from "date-fns";

interface GraphState {
  messages: Array<{ role: string; content: string }>;
  userId?: string;
  orgId?: string;
  context?: {
    projectCount: number;
    ticketCount: number;
    todayAttendance: {
      checkedIn: boolean;
      checkedOut: boolean;
      workHours: string | null;
    } | null;
    pendingLeaves: number;
    recentPayrolls: Array<{
      month: string;
      netSalary: string;
      status: string;
    }>;
  };
}

async function fetchContext(userId: string, orgId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  
  const [projectCount, ticketCount, todayAttendance, pendingLeaves, recentPayrolls] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.orgId, orgId)),
    db.select({ count: sql<number>`count(*)` }).from(tickets).where(eq(tickets.orgId, orgId)),
    db.query.attendance.findFirst({
      where: and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)),
    }),
    db.query.leaveRequests.findMany({
      where: and(eq(leaveRequests.userId, userId), eq(leaveRequests.status, "PENDING"), eq(leaveRequests.orgId, orgId)),
      limit: 5,
    }),
    db.query.payrolls.findMany({
      where: and(eq(payrolls.userId, userId), eq(payrolls.orgId, orgId)),
      orderBy: [desc(payrolls.createdAt)],
      limit: 3,
    }),
  ]);

  return {
    projectCount: projectCount[0]?.count || 0,
    ticketCount: ticketCount[0]?.count || 0,
    todayAttendance: todayAttendance ? {
      checkedIn: !!todayAttendance.checkIn,
      checkedOut: !!todayAttendance.checkOut,
      workHours: todayAttendance.workHours,
    } : null,
    pendingLeaves: pendingLeaves.length,
    recentPayrolls: recentPayrolls.map(p => ({
      month: p.month,
      netSalary: p.netSalary,
      status: p.status || "UNKNOWN",
    })),
  };
}

async function enrichContext(state: GraphState): Promise<GraphState> {
  if (!state.userId || !state.orgId) {
    return state;
  }

  const context = await fetchContext(state.userId, state.orgId);
  return { ...state, context };
}

async function generateResponse(state: GraphState): Promise<GraphState> {
  const contextPrompt = state.context ? `You are 'Vaivamm', an intelligent AI assistant for the Vaivamm CRM platform.

Current Context:
- User has ${state.context.projectCount} projects and ${state.context.ticketCount} tickets
${state.context.todayAttendance ? `- Today's attendance: ${state.context.todayAttendance.checkedIn ? "Checked in" : "Not checked in"}${state.context.todayAttendance.checkedOut ? ", checked out" : ""}${state.context.todayAttendance.workHours ? `, worked ${state.context.todayAttendance.workHours} hours` : ""}` : "- No attendance record for today"}
- ${state.context.pendingLeaves} pending leave requests
- Recent payrolls: ${state.context.recentPayrolls.map(p => `${p.month} (${p.status})`).join(", ") || "None"}

You help users with:
1. HR Management: Attendance tracking, leave requests, payroll, employee management
2. Project Management: Creating tickets, managing sprints, tracking time, viewing burndown charts
3. Data Analysis: Providing insights on attendance patterns, project progress, team performance
4. General Questions: Answering questions about the platform and its features

Tone: Professional, Helpful, Futuristic, Concise.
Always provide actionable advice when possible.
If asked about specific data, use the context above or guide users to the relevant section.` : `You are 'Vaivamm', an intelligent AI assistant for the Vaivamm CRM platform. You help users with HR management, project management, and data analysis.`;

  return { ...state, context: state.context };
}

export async function processChatWithGraph(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  orgId: string
) {
  let state: GraphState = {
    messages,
    userId,
    orgId,
  };

  state = await enrichContext(state);
  state = await generateResponse(state);

  const contextPrompt = state.context ? `You are 'Vaivamm', an intelligent AI assistant for the Vaivamm CRM platform.

Current Context:
- User has ${state.context.projectCount} projects and ${state.context.ticketCount} tickets
${state.context.todayAttendance ? `- Today's attendance: ${state.context.todayAttendance.checkedIn ? "Checked in" : "Not checked in"}${state.context.todayAttendance.checkedOut ? ", checked out" : ""}${state.context.todayAttendance.workHours ? `, worked ${state.context.todayAttendance.workHours} hours` : ""}` : "- No attendance record for today"}
- ${state.context.pendingLeaves} pending leave requests
- Recent payrolls: ${state.context.recentPayrolls.map(p => `${p.month} (${p.status})`).join(", ") || "None"}

You help users with:
1. HR Management: Attendance tracking, leave requests, payroll, employee management
2. Project Management: Creating tickets, managing sprints, tracking time, viewing burndown charts
3. Data Analysis: Providing insights on attendance patterns, project progress, team performance
4. General Questions: Answering questions about the platform and its features

Tone: Professional, Helpful, Futuristic, Concise.
Always provide actionable advice when possible.
If asked about specific data, use the context above or guide users to the relevant section.` : `You are 'Vaivamm', an intelligent AI assistant for the Vaivamm CRM platform. You help users with HR management, project management, and data analysis.`;

  const result = streamText({
    model: google("gemini-1.5-pro-latest"),
    messages: state.messages.map(m => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    system: contextPrompt,
    temperature: 0.7,
  });

  return result;
}

