"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  width?: string
}

export function SelectField({ value, onChange, options, placeholder = "Select…", className, width }: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = useCallback((val: string) => {
    onChange(val)
    setOpen(false)
  }, [onChange])

  return (
    <div ref={ref} className={cn("relative", width)} style={width ? { width } : undefined}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "input-field flex items-center justify-between gap-2 text-left",
          !selected && "text-gray-400",
          className
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-1 w-full min-w-[160px] rounded-lg bg-white py-1 popup-bevel-sm"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-xs text-left transition-colors",
                  opt.value === value
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
