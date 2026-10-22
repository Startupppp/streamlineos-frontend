const AUTH_LOGOUT = "auth:logout";
const AUTH_CHANNEL_NAME = "streamlineos:auth";
// BroadcastChannel delivers to every other channel object, including the
// listener in the tab that posted. Tagging the sender lets that tab ignore its
// own sign-out instead of treating it as "session expired" (#47).
const TAB_ID = Math.random().toString(36).slice(2);

type LogoutMessage = { type: typeof AUTH_LOGOUT; from: string };

function isForeignLogout(data: unknown): boolean {
  if (data === AUTH_LOGOUT) return true;
  if (typeof data !== "object" || data === null) return false;
  const message = data as Partial<LogoutMessage>;
  return message.type === AUTH_LOGOUT && message.from !== TAB_ID;
}

function openAuthChannel(): BroadcastChannel | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return typeof BroadcastChannel === "undefined"
      ? undefined
      : new BroadcastChannel(AUTH_CHANNEL_NAME);
  } catch {
    return undefined;
  }
}

export function publishLogout(): void {
  if (typeof window === "undefined") return;
  const channel = openAuthChannel();
  try {
    if (channel) {
      channel.postMessage({ type: AUTH_LOGOUT, from: TAB_ID } satisfies LogoutMessage);
    } else {
      window.localStorage.setItem(AUTH_CHANNEL_NAME, AUTH_LOGOUT);
      window.localStorage.removeItem(AUTH_CHANNEL_NAME);
    }
  } catch {}
  finally {
    channel?.close();
  }
}

export function subscribeLogout(onLogout: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const channel = openAuthChannel();

  function handleMessage(event: MessageEvent<unknown>) {
    if (isForeignLogout(event.data)) onLogout();
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === AUTH_CHANNEL_NAME && event.newValue === AUTH_LOGOUT)
      onLogout();
  }

  channel?.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.removeEventListener("message", handleMessage);
    channel?.close();
    window.removeEventListener("storage", handleStorage);
  };
}
