import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MQ_MAX = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(MQ_MAX)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// Stable references required by useSyncExternalStore
const mqSubscribe = (cb: () => void): (() => void) => {
  const mql = window.matchMedia(MQ_MAX)
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}
const mqClientSnapshot = () => window.matchMedia(MQ_MAX).matches
// Server snapshot = false = "not mobile" = desktop.
// React hydrates using this snapshot (matching SSR which always renders as desktop),
// then re-renders synchronously with the real client value on mobile devices.
const mqServerSnapshot = () => false

/**
 * Returns true when the viewport is at the desktop breakpoint (≥768px).
 * Server snapshot is 'desktop' so the SSR markup is preserved without a hydration mismatch.
 * On mobile clients, React re-renders immediately after hydration, skipping desktop-only
 * trees and their query subscriptions.
 */
export function useIsDesktopViewport(): boolean {
  const isMobile = React.useSyncExternalStore(mqSubscribe, mqClientSnapshot, mqServerSnapshot)
  return !isMobile
}
