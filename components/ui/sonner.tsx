"use client"

import { useEffect, useRef } from "react"
import { Toaster as Sonner, useSonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

function playNotificationSound(type: "success" | "error" | "other") {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === "success") {
      osc.type = "sine"
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    } else if (type === "error") {
      osc.type = "sine"
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } else {
      osc.type = "sine"
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
    }

    osc.onended = () => ctx.close()
  } catch {
  }
}

function ToastSoundListener() {
  const { toasts } = useSonner()
  const prevCountRef = useRef(0)
  const knownIdsRef = useRef<Set<string | number>>(new Set())

  useEffect(() => {
    const currentIds = new Set(toasts.map((t) => t.id))
    const isNewToast = toasts.some((t) => !knownIdsRef.current.has(t.id))

    if (isNewToast && toasts.length > prevCountRef.current) {
      const newest = toasts.find((t) => !knownIdsRef.current.has(t.id))
      if (newest) {
        const type =
          newest.type === "success"
            ? "success"
            : newest.type === "error"
            ? "error"
            : "other"
        playNotificationSound(type)
      }
    }

    prevCountRef.current = toasts.length
    knownIdsRef.current = currentIds
  }, [toasts])

  return null
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <>
      <ToastSoundListener />
      <Sonner
        {...props}
        className={["toaster group", props.className].filter(Boolean).join(" ")}
        closeButton
        toastOptions={{
          ...props.toastOptions,
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton:
              "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton:
              "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            ...props.toastOptions?.classNames,
          },
        }}
      />
    </>
  )
}

export { Toaster }
