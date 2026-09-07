export type UserBulkAction = "suspend" | "archive" | "restore";

function assertNever(value: never): never {
  throw new Error(`Unhandled bulk action: ${String(value)}`);
}

export function getUserBulkActionCopy(action: UserBulkAction, count: number) {
  const subject = `${count} user${count === 1 ? "" : "s"}`;
  switch (action) {
    case "suspend":
      return {
        title: `Suspend ${subject}?`,
        description: `${subject} will lose access immediately. Their data and membership are retained and they can be reactivated at any time. Organization owners and module owners in the selection will be skipped.`,
        confirmLabel: "Suspend",
      };
    case "archive":
      return {
        title: `Archive ${subject}?`,
        description: `${subject} will be archived and lose access. Their data and membership are retained and they can be restored at any time. Organization owners and module owners in the selection will be skipped.`,
        confirmLabel: "Archive",
      };
    case "restore":
      return {
        title: `Restore ${subject}?`,
        description: `${subject} will regain access to this organization immediately. It will appear in each user's workspace switcher after their session refreshes.`,
        confirmLabel: "Restore",
      };
    default:
      return assertNever(action);
  }
}
