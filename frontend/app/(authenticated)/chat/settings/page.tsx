import { redirect } from "next/navigation";

/** Preserve old bookmarks without maintaining a second chat settings surface. */
export default function ChatSettingsRedirectPage() {
  redirect("/chat");
}
