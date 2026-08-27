import { bm25Search } from '@/lib/services/bm25'
import type { StoredChunk } from '@/lib/types'

describe('bm25', () => {
  const mockChunks: StoredChunk[] = [
    {
      id: 'chunk-1',
      documentId: 'doc-1',
      documentName: 'Document 1',
      page: 1,
      content: 'This is a test document about machine learning and artificial intelligence.',
      tokenCount: 10,
      startOffset: 0,
      endOffset: 10,
    },
    {
      id: 'chunk-2',
      documentId: 'doc-1',
      documentName: 'Document 1',
      page: 2,
      content: 'Machine learning is a subset of artificial intelligence.',
      tokenCount: 10,
      startOffset: 10,
      endOffset: 20,
    },
    {
      id: 'chunk-3',
      documentId: 'doc-2',
      documentName: 'Document 2',
      page: 1,
      content: 'The quick brown fox jumps over the lazy dog.',
      tokenCount: 10,
      startOffset: 0,
      endOffset: 10,
    },
  ]
  
  it('should return empty array for empty query', () => {
    const results = bm25Search('', mockChunks, 5)
    expect(results).toEqual([])
  })
  
  it('should return empty array for empty chunks', () => {
    const results = bm25Search('test', [], 5)
    expect(results).toEqual([])
  })
  
  it('should return chunks sorted by score', () => {
    const results = bm25Search('machine learning', mockChunks, 5)
    
    expect(results).toHaveLength(3)
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
  })
  
  it('should respect topK parameter', () => {
    const results = bm25Search('machine', mockChunks, 1)
    
    expect(results).toHaveLength(1)
  })
  
  it('should include query terms in result', () => {
    const results = bm25Search('machine learning', mockChunks, 5)
    
    expect(results[0].queryTerms).toContain('machine')
    expect(results[0].queryTerms).toContain('learning')
  })
})