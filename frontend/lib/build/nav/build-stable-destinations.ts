import { CheckSquare, Inbox, LayoutList, PenLine } from "lucide-react";
import { BUILD_ROOT_PATH } from "../build-scope";
import type { BuildNavDestination } from "./build-nav-destination";

export const BUILD_MY_WORK_DESTINATIONS: BuildNavDestination[] = [
  {
    id: "my-work-inbox",
    label: "Inbox",
    href: `${BUILD_ROOT_PATH}/inbox`,
    icon: Inbox,
    requiredPermission: "build:tickets:view",
    badge: "inbox-unread",
    mobilePriority: 40,
  },
  {
    id: "my-work-assigned",
    label: "Assigned to me",
    href: `${BUILD_ROOT_PATH}/my-work`,
    icon: CheckSquare,
    requiredPermission: "build:tickets:view",
    mobilePriority: 20,
  },
  {
    id: "my-work-drafts",
    label: "Drafts",
    href: `${BUILD_ROOT_PATH}/drafts`,
    icon: PenLine,
    requiredPermission: "build:tickets:view",
    mobilePriority: 50,
  },
];

export const BUILD_BROWSE_ALL_DESTINATION: BuildNavDestination = {
  id: "browse-all",
  label: "Browse all Build",
  href: `${BUILD_ROOT_PATH}/all-work`,
  icon: LayoutList,
  requiredPermission: "build:tickets:view",
};
