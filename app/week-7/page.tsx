"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { Header } from "@/components/rag/header"
import { Brain, Cog, GitCompare, Zap, ShieldCheck, Activity, Trophy, Flame, ArrowRight, Car, Flag, Sparkles } from "lucide-react"

const AgentRaceDashboard = dynamic(
  () => import("@/components/benchmark/agent-race-dashboard").then(m => ({ default: m.AgentRaceDashboard })),
  { ssr: false }
)

function WorkflowStepper() {
  const steps = [
    { icon: Cog, label: "Tool Design", desc: "check_deprecation tool + Pydantic schemas", color: "from-indigo-500 to-violet-500" },
    { icon: ShieldCheck, label: "Fixed Workflow", desc: "Hard-coded retrieve → check → answer", color: "from-emerald-500 to-teal-500" },
    { icon: Brain, label: "Race Questions", desc: "10 real questions, 5 deprecation-dependent", color: "from-amber-500 to-orange-500" },
    { icon: GitCompare, label: "Race Harness", desc: "Run both, compare metrics side-by-side", color: "from-rose-500 to-pink-500" },
    { icon: Activity, label: "Budget Guard", desc: "4 budgets + per-step timeout, clean exit", color: "from-cyan-500 to-blue-500" },
  ]
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-emerald-50/60 pointer-events-none" />
      <div className="relative flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Task Set E</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Agent vs. Workflow</h1>
          <p className="mt-1 text-base text-gray-500 max-w-lg leading-relaxed">
            Does a ReAct agent outperform a fixed pipeline? We raced both on the same 10 real developer questions and measured everything that matters.
          </p>
        </div>
        <ol className="flex flex-wrap items-center gap-4 sm:gap-5">
          {steps.map((s, i) => (
            <li key={s.label} className="flex flex-col items-center gap-1.5 flex-1 min-w-[100px]">
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                <s.icon className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-gray-700 ring-2 ring-white shadow-sm">
                  {i + 1}
                </span>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-semibold text-gray-900 leading-tight">{s.label}</div>
                <div className="text-[9px] text-gray-400 mt-0.5 leading-tight max-w-[100px]">{s.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function RaceButton({ onRaceComplete }: { onRaceComplete: () => void }) {
  const [running, setRunning] = useState(false)

  const handleStart = async () => {
    if (running) return
    setRunning(true)
    try {
      const res = await fetch("http://localhost:8000/api/v1/benchmark/race", { method: "POST" })
      if (!res.ok) {
        console.error("Race failed:", res.status)
      } else {
        await res.json()
      }
    } catch (err) {
      console.error("Race error:", err)
    } finally {
      setRunning(false)
      onRaceComplete()
    }
  }

  return (
    <div className="flex justify-center my-6 px-4">
      <motion.button
        onClick={handleStart}
        whileHover={running ? {} : { scale: 1.02 }}
        whileTap={running ? {} : { scale: 0.97 }}
        disabled={running}
        animate={{ width: running ? "100%" : 200 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-full border-2 border-indigo-200 bg-slate-900 shadow-xl transition-all cursor-pointer select-none group"
        style={{ height: 100 }}
      >
        {/* Animated Road Track */}
        <div className="absolute inset-0 flex flex-col justify-center items-center px-4">
          <div className="relative w-full h-[2px] bg-slate-700 overflow-hidden">
            {/* Moving Road Lines effect during race */}
            {running && (
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: -20 }}
                transition={{ repeat: Infinity, duration: 0.2, ease: 'linear' }}
                className="absolute inset-0 bg-[linear-gradient(90deg,_transparent_50%,_#818cf8_50%)] bg-[length:12px_100%]"
              />
            )}
          </div>
        </div>

        {/* Start / Finish Checkered Line */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center">
          <Flag className={`h-4 w-4 transition-colors ${running ? 'text-amber-400 animate-bounce' : 'text-slate-600'}`} />
        </div>

        {/* Car & Exhaust Smoke Animation */}
        <AnimatePresence>
          {running && (
            <motion.div
              initial={{ x: -40 }}
              animate={{ x: 180 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 999, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 flex items-center z-20"
            >
              {/* Exhaust Smoke Particles */}
              <motion.div
                initial={{ opacity: 0.8, scale: 0.5 }}
                animate={{ opacity: 0, scale: 1.5, x: -10 }}
                transition={{ repeat: Infinity, duration: 0.3 }}
                className="w-2 h-2 rounded-full bg-slate-400 mr-1"
              />

              {/* Car with Engine Bounce */}
              <motion.div
                animate={{ y: [0, -1.5, 0] }}
                transition={{ repeat: Infinity, duration: 0.12 }}
              >
                <Car className="h-7 w-7 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Button Content / Status Label */}
        <div className="relative z-10 flex flex-col items-center justify-between h-full py-3 px-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className={`h-3.5 w-3.5 ${running ? 'text-indigo-400 animate-spin' : 'text-slate-400'}`} />
            <span className="text-xs font-black text-slate-200 tracking-widest uppercase">
              {running ? 'Racing...' : 'Start Race'}
            </span>
          </div>

          <span className="text-[10px] font-medium text-slate-400 group-hover:text-indigo-300 transition-colors">
            {running ? 'Agent vs Workflow' : 'Click to run benchmark'}
          </span>
        </div>
      </motion.button>
    </div>
  )
}

function ResultHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/40 via-transparent to-teal-100/40 pointer-events-none" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 shadow-sm shrink-0">
            <Trophy className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">The Verdict: Workflow Wins</h2>
            <p className="mt-1 text-sm text-gray-600 max-w-xl leading-relaxed">
              The fixed workflow beats the agent on every single metric. On the agent's failure (gh-006), it exhausted its 5-step budget deliberating among 4 tools — the cost of a larger surface area eating into a fixed iteration limit.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center rounded-xl bg-white/80 border border-emerald-200 px-4 py-2 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide text-gray-400">Pass Rate</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-400 line-through">80%</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="text-lg font-bold text-emerald-600">90%</span>
            </div>
          </div>
          <div className="text-center rounded-xl bg-white/80 border border-emerald-200 px-4 py-2 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide text-gray-400">p50 Latency</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-400 line-through">18.0s</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="text-lg font-bold text-emerald-600">3.4s</span>
            </div>
          </div>
          <div className="text-center rounded-xl bg-white/80 border border-emerald-200 px-4 py-2 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide text-gray-400">Cost/Success</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-400 line-through">$0.0012</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="text-lg font-bold text-emerald-600">$0.0004</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Week7Page() {
  const [raceTrigger, setRaceTrigger] = useState(0)

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(1400px_700px_at_80%_-10%,rgba(99,102,241,0.10),transparent),radial-gradient(1000px_600px_at_-10%_30%,rgba(16,185,129,0.06),transparent),radial-gradient(800px_500px_at_50%_100%,rgba(244,63,94,0.04),transparent)] bg-gray-50">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-8">
          <WorkflowStepper />
          <RaceButton onRaceComplete={() => setRaceTrigger(t => t + 1)} />
          <ResultHero />
          <div className="space-y-6">
            <AgentRaceDashboard raceTrigger={raceTrigger} />
          </div>
        </div>
      </div>
    </div>
  )
}
