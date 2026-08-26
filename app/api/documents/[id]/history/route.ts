import { NextRequest } from "next/server"
import { getDocumentHistory } from "@/lib/services/processing-history-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const history = await getDocumentHistory(id)
    return Response.json({ success: true, data: history })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch processing history"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
