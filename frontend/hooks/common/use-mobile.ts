import * as React from "react"

const MOBILE_BREAKPOINT = 768
const LG_BREAKPOINT = 1024
const MQ_MAX = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
const MQ_BELOW_LG = `(max-width: ${LG_BREAKPOINT - 1}px)`

function subscribeMediaQuery(query: string, onStoreChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    (onStoreChange) => subscribeMediaQuery(MQ_MAX, onStoreChange),
    () => window.matchMedia(MQ_MAX).matches,
    () => false,
  )
}

export function useIsBelowLg() {
  return React.useSyncExternalStore(
    (onStoreChange) => subscribeMediaQuery(MQ_BELOW_LG, onStoreChange),
    () => window.matchMedia(MQ_BELOW_LG).matches,
    () => false,
  )
}

