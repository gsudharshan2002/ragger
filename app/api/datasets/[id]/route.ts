import { NextRequest } from "next/server"
import { readJson, writeJson, getDataPath } from "@/lib/services/storage"
import type { GoldenDataset } from "@/lib/types"

export const dynamic = "force-dynamic"

const DATASETS_PATH = getDataPath("golden-datasets.json")

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const datasets = await readJson<GoldenDataset[]>(DATASETS_PATH)
    const dataset = (datasets || []).find((d) => d.id === id)

    if (!dataset) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Dataset not found" } },
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: dataset })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch dataset"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const datasets = await readJson<GoldenDataset[]>(DATASETS_PATH)
    const list = datasets || []
    const idx = list.findIndex((d) => d.id === id)

    if (idx === -1) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Dataset not found" } },
        { status: 404 }
      )
    }

    list[idx] = {
      ...list[idx],
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    }

    await writeJson(DATASETS_PATH, list)

    return Response.json({ success: true, data: list[idx] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update dataset"
    return Response.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const datasets = await readJson<GoldenDataset[]>(DATASETS_PATH)
    const list = datasets || []
    const filtered = list.filter((d) => d.id !== id)

    if (filtered.length === list.length) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Dataset not found" } },
        { status: 404 }
      )
    }

    await writeJson(DATASETS_PATH, filtered)

    return Response.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete dataset"
    return Response.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    )
  }
}
