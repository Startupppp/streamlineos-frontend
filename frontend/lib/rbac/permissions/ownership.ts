import type { Permission } from "./types";

export const OWNERSHIP_PERMISSIONS: Permission[] = [
  {
    name: "ownership:modules:view",
    resource: "ownership:modules",
    action: "view",
    description: "View module ownership assignments and transfer history",
  },
  {
    name: "ownership:modules:manage",
    resource: "ownership:modules",
    action: "manage",
    description: "Initiate, cancel or force-set module ownership transfers",
  },
  {
    name: "ownership:org:transfer",
    resource: "ownership:org",
    action: "transfer",
    description: "Initiate an organization ownership transfer handshake",
  },
  {
    name: "ownership:transfer:respond",
    resource: "ownership:transfer",
    action: "respond",
    description: "Accept or decline an ownership transfer directed at you",
  },
];
