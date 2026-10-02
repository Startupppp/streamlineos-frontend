"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAbly } from "ably/react";
import {
  ablyConnectionStore,
  type AblyConnectionSnapshot,
} from "./ably-connection-store";

const DISCONNECTED_SNAPSHOT: AblyConnectionSnapshot = {
  isConnected: false,
  connectionError: null,
  reconnectCount: 0,
};

export function useAblyConnection(): AblyConnectionSnapshot {
  const ably = useAbly();
  const store = useMemo(() => ablyConnectionStore(ably), [ably]);

  const subscribe = useCallback(
    (onChange: () => void) => store.subscribe(onChange),
    [store],
  );
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);
  const getServerSnapshot = useCallback(() => DISCONNECTED_SNAPSHOT, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
