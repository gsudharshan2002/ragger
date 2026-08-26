import type { DocumentVersion, DocumentProcessingStatus } from "@/lib/types"
import { generateId } from "@/lib/utils"
import { readJson, writeJson, getDataPath } from "./storage"

const VERSIONS_PATH = getDataPath("document-versions.json")

export async function getDocumentVersions(
  documentId: string
): Promise<DocumentVersion[]> {
  const versions = (await readJson<DocumentVersion[]>(VERSIONS_PATH)) || []
  return versions
    .filter((v) => v.documentId === documentId)
    .sort((a, b) => b.versionNumber - a.versionNumber)
}

export async function getLatestVersion(
  documentId: string
): Promise<DocumentVersion | null> {
  const versions = await getDocumentVersions(documentId)
  return versions.find((v) => v.isLatest) || null
}

export async function createVersion(
  documentId: string,
  filePath: string,
  fileSize: number
): Promise<DocumentVersion> {
  const versions = (await readJson<DocumentVersion[]>(VERSIONS_PATH)) || []
  const docVersions = versions.filter((v) => v.documentId === documentId)

  const maxVersion = docVersions.reduce(
    (max, v) => Math.max(max, v.versionNumber),
    0
  )

  for (const v of docVersions) {
    if (v.isLatest) {
      v.isLatest = false
    }
  }

  const now = new Date().toISOString()
  const newVersion: DocumentVersion = {
    id: generateId(),
    documentId,
    versionNumber: maxVersion + 1,
    filePath,
    fileSize,
    createdAt: now,
    status: "uploaded",
    pageCount: 0,
    chunkCount: 0,
    tokenCount: 0,
    isLatest: true,
  }

  versions.push(newVersion)
  await writeJson(VERSIONS_PATH, versions)

  return newVersion
}

export async function updateVersionStatus(
  versionId: string,
  status: DocumentProcessingStatus,
  updates?: Partial<Pick<DocumentVersion, "pageCount" | "chunkCount" | "tokenCount" | "error">>
): Promise<void> {
  const versions = (await readJson<DocumentVersion[]>(VERSIONS_PATH)) || []
  const idx = versions.findIndex((v) => v.id === versionId)
  if (idx === -1) {
    throw new Error(`Version not found: ${versionId}`)
  }

  versions[idx] = {
    ...versions[idx],
    status,
    ...(updates || {}),
  }

  await writeJson(VERSIONS_PATH, versions)
}

export async function restoreVersion(
  documentId: string,
  versionId: string
): Promise<DocumentVersion | null> {
  const versions = (await readJson<DocumentVersion[]>(VERSIONS_PATH)) || []
  const target = versions.find(
    (v) => v.id === versionId && v.documentId === documentId
  )
  if (!target) return null

  for (const v of versions) {
    if (v.documentId === documentId) {
      v.isLatest = false
    }
  }

  target.isLatest = true
  await writeJson(VERSIONS_PATH, versions)

  return target
}
