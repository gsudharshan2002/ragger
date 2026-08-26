"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedStopButtonProps {
  onClick: () => void
  disabled?: boolean
}

const FRAME_COUNT = 10
const FRAME_INTERVAL_MS = 90

export function AnimatedStopButton({ onClick, disabled }: AnimatedStopButtonProps) {
  const [frame, setFrame] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)

    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (reducedMotion || disabled) return
    intervalRef.current = setInterval(() => {
      setFrame((prev) => (prev % FRAME_COUNT) + 1)
    }, FRAME_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [reducedMotion, disabled])

  if (reducedMotion) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label="Stop generating"
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all",
          "bg-red-500 text-white hover:bg-red-600 shadow-sm"
        )}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="2" y="2" width="8" height="8" rx="1" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Stop generating"
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-all overflow-hidden",
        "bg-red-500 hover:bg-red-600 shadow-sm"
      )}
    >
      <img
        src={`/boom${frame}.svg`}
        alt=""
        width={32}
        height={32}
        className="object-contain"
        draggable={false}
      />
    </button>
  )
}
