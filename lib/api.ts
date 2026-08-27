/**
import { apiFetch, previewUrl as previewUrlHelper } from "@/lib/api"
 * Centralized API client for the FastAPI backend.
 *
 * Base URL is read from NEXT_PUBLIC_API_URL (defaults to http://localhost:8000).
 * All paths are relative to the FastAPI /api/v1 prefix.
 *
 * Example:
 *   apiFetch("/chat/stream", { method: "POST", body: ... })
 *   apiGet("/documents")
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_PREFIX = "/api/v1"

export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const clean = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}${API_PREFIX}${clean}`
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) }
  // Only force JSON content-type when we're actually sending JSON (not FormData,
  // where the browser must set the multipart boundary itself).
  if (!(options.body instanceof FormData) && !("Content-Type" in headers)) {
    headers["Content-Type"] = "application/json"
  }
  return fetch(apiUrl(path), {
    ...options,
    headers,
  })
}

export async function apiGet(path: string): Promise<Response> {
  return apiFetch(path, { method: "GET" })
}

export async function apiPost(
  path: string,
  body?: unknown,
  options: RequestInit = {}
): Promise<Response> {
  return apiFetch(path, {
    ...options,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function apiPut(path: string, body?: unknown): Promise<Response> {
  return apiFetch(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) })
}

export async function apiDelete(path: string): Promise<Response> {
  return apiFetch(path, { method: "DELETE" })
}

/**
 * Upload a file (multipart/form-data). Does not set Content-Type so the
 * browser sets the boundary correctly.
 */
export async function apiUpload(path: string, formData: FormData): Promise<Response> {
  return apiFetch(path, {
    method: "POST",
    body: formData,
    headers: {}, // let browser set multipart boundary
  })
}

export function previewUrl(documentId: string): string {
  return apiUrl(`/documents/${documentId}/preview`)
}
