import { NextRequest } from "next/server"
import { getSettings, updateSettings } from "@/lib/services/settings"
import { getAllDocuments, getAllChunks } from "@/lib/services/document-service"
import type { AppSettings } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const settings = await getSettings()
    const documents = await getAllDocuments()
    const chunks = await getAllChunks()

    const embeddingConfigStatus =
      settings.embeddingProvider !== "none" && settings.embeddingModel.length > 0
        ? "configured"
        : "not_configured"

    return Response.json({
      success: true,
      data: {
        settings,
        embeddingConfigStatus,
        documentCount: documents.length,
        totalChunks: chunks.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch RAG config"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const updates = body as Partial<AppSettings>
    const updated = await updateSettings(updates)

    return Response.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update RAG config"
    return Response.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 500 }
    )
  }
}
