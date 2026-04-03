import { dailyNotifications } from "./daily-notifications";
import { autoCheckout } from "./auto-checkout";
import { slaCheck } from "./sla-check";
import { notificationHandler } from "./notification-handler";

export const inngestFunctions = [
  dailyNotifications,
  autoCheckout,
  slaCheck,
  notificationHandler,
];
