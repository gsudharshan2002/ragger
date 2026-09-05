"use client"

import dynamic from "next/dynamic"
import { Header } from "@/components/rag/header"
import { CheckCircle2, Gavel, Pencil, Sparkles } from "lucide-react"

const DeveloperDocsEvaluation = dynamic(
  () => import("@/components/benchmark/developer-docs-evaluation").then(m => ({ default: m.DeveloperDocsEvaluation })),
  { ssr: false }
)

const LabelAnswers = dynamic(
  () => import("@/components/benchmark/label-answers").then(m => ({ default: m.LabelAnswers })),
  { ssr: false }
)

const JudgeValidation = dynamic(
  () => import("@/components/benchmark/judge-validation").then(m => ({ default: m.JudgeValidation })),
  { ssr: false }
)

function WorkflowStepper() {
  const steps = [
    { icon: Pencil, label: "Generate & label", desc: "Blind hand labels", color: "from-indigo-500 to-violet-500" },
    { icon: CheckCircle2, label: "Hand labels done", desc: "25/25 pass/fail", color: "from-emerald-500 to-teal-500" },
    { icon: Gavel, label: "Validate judge", desc: "Compare agreement", color: "from-amber-500 to-orange-500" },
  ]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-emerald-50/60 pointer-events-none" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Week 6 — Human vs AI Judge</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-600">Blind hand labeling first, then validate the AI judge against your labels. No judge signals during labeling.</p>
        </div>
        <ol className="flex items-center gap-4">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3">
              <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                <s.icon className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-gray-700 ring-2 ring-white">
                  {i + 1}
                </span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-gray-900">{s.label}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:block h-px w-12 bg-gradient-to-r from-gray-200 to-transparent" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default function Week6Page() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(99,102,241,0.12),transparent),radial-gradient(900px_500px_at_-10%_20%,rgba(16,185,129,0.10),transparent)] bg-gray-50">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
          <WorkflowStepper />
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-200/30 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p className="text-sm leading-relaxed text-amber-950">
                <span className="font-semibold">Workflow tip:</span> Start with <em>Blind Judge Validation - Hand Labels</em> and generate answers for labeling. Label all cases pass/fail before running <em>Human vs. AI Judge Agreement</em>. The last card is the judge-enabled benchmark run, not the blind labeling step.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <LabelAnswers />
            <JudgeValidation />
            <DeveloperDocsEvaluation />
          </div>
        </div>
      </div>
    </div>
  )
}
