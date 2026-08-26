"use client"

import dynamic from "next/dynamic"

const DatasetManagement = dynamic(
  () => import("@/components/benchmark/dataset-management").then(m => ({ default: m.DatasetManagement })),
  { ssr: false }
)

export default function DatasetsPage() {
  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <DatasetManagement />
        </div>
      </div>
    </div>
  )
}
