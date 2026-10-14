const AUTH_LOGOUT = "auth:logout";
const AUTH_CHANNEL_NAME = "streamlineos:auth";

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
      channel.postMessage(AUTH_LOGOUT);
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
    if (event.data === AUTH_LOGOUT) onLogout();
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
