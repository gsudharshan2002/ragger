import { NextRequest } from "next/server"
import { getDocumentChunks } from "@/lib/services/document-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chunks = await getDocumentChunks(id)
    return Response.json({ success: true, data: chunks })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch chunks"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
