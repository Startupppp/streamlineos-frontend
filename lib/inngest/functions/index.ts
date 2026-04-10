import { dailyNotifications } from "./daily-notifications";
import { autoCheckout } from "./auto-checkout";
import { slaCheck } from "./sla-check";
import { notificationHandler } from "./notification-handler";
import { webhookDispatcher } from "./webhook-dispatcher";
import { weeklyAttendanceReport } from "./weekly-attendance-report";
import { weeklyCeoRecap } from "./weekly-ceo-recap";
import { monthlyExpenseReport } from "./monthly-expense-report";
import { monthlyLeaveReset } from "./monthly-leave-reset";
import { holidayNotifications } from "./holiday-notifications";
import { paymentReminders } from "./payment-reminders";
import { dailySalesDigest } from "./daily-sales-digest";
import {
  onResignationSubmitted,
  onResignationHrApproved,
  onResignationCeoApproved,
  onTerminationSubmitted,
  onTerminationCeoApproved,
} from "./hr-exit-notifications";

export const inngestFunctions = [
  dailyNotifications,
  autoCheckout,
  slaCheck,
  notificationHandler,
  webhookDispatcher,
  weeklyAttendanceReport,
  weeklyCeoRecap,
  monthlyExpenseReport,
  monthlyLeaveReset,
  holidayNotifications,
  paymentReminders,
  dailySalesDigest,
  onResignationSubmitted,
  onResignationHrApproved,
  onResignationCeoApproved,
  onTerminationSubmitted,
  onTerminationCeoApproved,
];
