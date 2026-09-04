"use client"

import dynamic from "next/dynamic"
import { Header } from "@/components/rag/header"

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

export default function Week6Page() {
  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <DeveloperDocsEvaluation />
          <LabelAnswers />
          <JudgeValidation />
        </div>
      </div>
    </div>
  )
}
