import { NextRequest } from "next/server"
import { getDocumentVersions } from "@/lib/services/document-version-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const versions = await getDocumentVersions(id)
    return Response.json({ success: true, data: versions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch versions"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
