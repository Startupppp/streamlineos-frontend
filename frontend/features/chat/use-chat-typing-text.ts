import { useMemo } from "react";

type TypingUser = { name: string };

export function useChatTypingText(typingUsers: TypingUser[] | undefined) {
  return useMemo(() => {
    if (!typingUsers?.length) return null;
    const names = typingUsers.map((user) => user.name.split(" ")[0]);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  }, [typingUsers]);
}
