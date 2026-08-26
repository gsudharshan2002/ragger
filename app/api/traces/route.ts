import { NextRequest } from "next/server"
import { listTraces } from "@/lib/services/trace-service"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  try {
    const traces = await listTraces(50)
    return Response.json({ success: true, data: traces })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch traces"
    return Response.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
