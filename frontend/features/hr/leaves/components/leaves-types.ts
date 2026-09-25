export interface LeaveBalance {
  id: number;
  leaveTypeId: number | null;
  balance: string;
  typeName: string | null;
  daysPerYear: number | null;
}

export interface LeaveType {
  id: number;
  name: string;
  /** V-049. The configured policy's name. Optional until the backend half lands. */
  policyName?: string | null;
}

export interface LeaveRequest {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  status: string | null;
  priority: string | null;
  reason: string | null;
  managerComment?: string | null;
  rejectionReason?: string | null;
  isHalfDay?: boolean;
  halfDayPeriod?: string | null;
  lopDays?: string | number | null;
  createdAt?: string | Date | null;
  leaveType: { name: string } | null;
  approver?: { name: string | null } | null;
  /**
   * HRMS-E2E-012. Matches `leavesTeamItemSchema` field for field (FE-28).
   * It used to declare a non-optional `email` the API has never sent, and no
   * `name` — so the row's fallback read a field that is always undefined while
   * ignoring the one most people have. `email` stays available for surfaces
   * whose own endpoint does return it, but it is optional, because this one
   * does not.
   */
  user?: {
    id?: string | null;
    name?: string | null;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export interface ApprovedLeave {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  user: {
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
  leaveType: { name: string } | null;
}

export interface WfhRequest {
  id: number;
  date: string;
  reason: string | null;
  status: string | null;
  rejectionReason?: string | null;
  createdAt: string | Date | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
}
