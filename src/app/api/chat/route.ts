import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { tickets, projects, attendance, leaveRequests, payrolls } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { format } from 'date-fns';

export const maxDuration = 30;

async function getContextData(userId: string, orgId: string) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [projectCount, ticketCount, todayAttendance, pendingLeaves, recentPayrolls] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.orgId, orgId)),
    db.select({ count: sql<number>`count(*)` }).from(tickets).where(eq(tickets.orgId, orgId)),
    db.query.attendance.findFirst({
      where: and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)),
    }),
    db.query.leaveRequests.findMany({
      where: and(eq(leaveRequests.userId, userId), eq(leaveRequests.status, 'PENDING'), eq(leaveRequests.orgId, orgId)),
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
      status: p.status,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const contextData = await getContextData(userId, orgId);
    
    const contextPrompt = `You are 'Vaivamm', an intelligent AI assistant for the Vaivamm CRM platform.

Current Context:
- User has ${contextData.projectCount} projects and ${contextData.ticketCount} tickets
${contextData.todayAttendance ? `- Today's attendance: ${contextData.todayAttendance.checkedIn ? 'Checked in' : 'Not checked in'}${contextData.todayAttendance.checkedOut ? ', checked out' : ''}${contextData.todayAttendance.workHours ? `, worked ${contextData.todayAttendance.workHours} hours` : ''}` : '- No attendance record for today'}
- ${contextData.pendingLeaves} pending leave requests
- Recent payrolls: ${contextData.recentPayrolls.map(p => `${p.month} (${p.status})`).join(', ') || 'None'}

You help users with:
1. HR Management: Attendance tracking, leave requests, payroll, employee management
2. Project Management: Creating tickets, managing sprints, tracking time, viewing burndown charts
3. Data Analysis: Providing insights on attendance patterns, project progress, team performance
4. General Questions: Answering questions about the platform and its features

Tone: Professional, Helpful, Futuristic, Concise.
Always provide actionable advice when possible.
If asked about specific data, use the context above or guide users to the relevant section.`;

    const result = streamText({
      model: google('gemini-1.5-pro-latest'),
      messages,
      system: contextPrompt,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
