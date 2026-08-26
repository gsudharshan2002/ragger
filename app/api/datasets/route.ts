import { NextRequest } from "next/server"
import { readJson, writeJson, getDataPath } from "@/lib/services/storage"
import { generateId } from "@/lib/utils"
import type { GoldenDataset } from "@/lib/types"

export const dynamic = "force-dynamic"

const DATASETS_PATH = getDataPath("golden-datasets.json")

export async function GET() {
  try {
    const datasets = await readJson<GoldenDataset[]>(DATASETS_PATH)
    return Response.json({ success: true, data: datasets || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch datasets"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const datasets = await readJson<GoldenDataset[]>(DATASETS_PATH)
    const existing = datasets || []

    const newDataset: GoldenDataset = {
      id: generateId(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    existing.push(newDataset)
    await writeJson(DATASETS_PATH, existing)

    return Response.json({ success: true, data: newDataset }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create dataset"
    return Response.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 500 }
    )
  }
}
