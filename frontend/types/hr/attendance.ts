export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type AttendanceStatus = "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT";
export type WfhRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface BreakEntry {
  start: string;
  end?: string;
}

export interface AttendanceLog {
  id: number;
  orgId: string;
  userId: string;
  date: string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string | null;
  workHours: string | null;
  breakHours: string | null;
  breaks: BreakEntry[] | null;
  locationData: unknown | null;
  isOvertime: boolean | null;
  autoCheckedOut: boolean | null;
  createdAt: Date | string | null;
}

export interface DailyStats {
  workHours: string;
  breakHours: string;
  isOvertime: boolean;
}

export interface AttendanceStatusResult {
  status: AttendanceStatus;
  logs: AttendanceLog[];
  todayLog: AttendanceLog | null | undefined;
  dailyStats: DailyStats;
  cooldownRemaining: number;
}

export interface WfhRequest {
  id: number;
  orgId: string;
  userId: string;
  date: string | Date;
  reason: string | null;
  approverId: string | null;
  status: WfhRequestStatus | null;
  rejectionReason: string | null;
  createdAt: Date | string | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  } | null;
  approver?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export interface Holiday {
  id: number;
  orgId: string;
  name: string;
  date: string;
  message: string | null;
  year: number;
  createdAt: Date | string | null;
}

export interface CheckInInput {
  location?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
  localDate?: string;
}

export interface RequestLeaveInput {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  approverId?: string;
  attachmentUrl?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "AM" | "PM";
}

export interface CreateWfhRequestInput {
  date: Date | string;
  reason?: string;
  approverId: string;
}

export interface ProcessWfhRequestInput {
  requestId: number;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface AddHolidayInput {
  name: string;
  date: Date | string;
  message?: string;
}

export interface DeleteHolidayInput {
  holidayId: number;
}

export interface UpdateHolidayInput {
  holidayId: number;
  name: string;
  date: string;
  message?: string;
}

export interface GetMonthlyAttendanceInput {
  userId?: string;
  year: number;
  month: number;
}

export interface TeamAttendanceEntry {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  department: string | null;
  status: "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT";
  checkIn: string | null;
  checkOut: string | null;
  workHours: string | null;
}

export interface TeamAttendanceStatusQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: TeamAttendanceEntry["status"];
  departmentId?: string;
}

export interface TeamAttendanceStatusResponse {
  data: TeamAttendanceEntry[];
  counts: Record<TeamAttendanceEntry["status"], number>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
