import { NextRequest } from "next/server"
import { getDocument, processDocument } from "@/lib/services/document-service"
import { startProcessingEvent } from "@/lib/services/processing-history-service"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doc = await getDocument(id)

    if (!doc) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      )
    }

    const event = await startProcessingEvent(id, "re-process", undefined, "knowledgeBaseId" in doc ? (doc as { knowledgeBaseId?: string }).knowledgeBaseId : undefined)

    processDocument(id)
      .then(() => {
        console.log(`Document ${id} re-processing completed`)
      })
      .catch((err) => {
        console.error(`Re-processing failed for document ${id}:`, err)
      })

    return Response.json({ success: true, data: { eventId: event.id } }, { status: 202 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to re-process document"
    return Response.json(
      { success: false, error: { code: "PROCESS_ERROR", message } },
      { status: 500 }
    )
  }
}
