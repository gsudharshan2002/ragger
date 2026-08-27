import { cosineSimilarity, vectorSearch } from '@/lib/services/vector-search'
import type { StoredChunk } from '@/lib/types'

describe('vector-search', () => {
  describe('cosineSimilarity', () => {
    it('should return 0 for empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0)
    })
    
    it('should return 0 for vectors of different lengths', () => {
      expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0)
    })
    
    it('should return 1 for identical non-zero vectors', () => {
      const vec = [1, 2, 3]
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1)
    })
    
    it('should calculate correct cosine similarity', () => {
      const a = [1, 0, 0]
      const b = [0, 1, 0]
      expect(cosineSimilarity(a, b)).toBe(0)
    })
    
    it('should handle zero vectors', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
    })
  })
  
  describe('vectorSearch', () => {
    const mockChunks: StoredChunk[] = [
      {
        id: 'chunk-1',
        documentId: 'doc-1',
        documentName: 'Document 1',
        page: 1,
        content: 'Content 1',
        tokenCount: 10,
        startOffset: 0,
        endOffset: 10,
        embedding: [1, 0, 0],
      },
      {
        id: 'chunk-2',
        documentId: 'doc-1',
        documentName: 'Document 1',
        page: 2,
        content: 'Content 2',
        tokenCount: 10,
        startOffset: 10,
        endOffset: 20,
        embedding: [0, 1, 0],
      },
      {
        id: 'chunk-3',
        documentId: 'doc-2',
        documentName: 'Document 2',
        page: 1,
        content: 'Content 3',
        tokenCount: 10,
        startOffset: 0,
        endOffset: 10,
        embedding: [0.5, 0.5, 0],
      },
    ]
    
    it('should return empty array for empty chunks', () => {
      const queryEmbedding = [1, 0, 0]
      const results = vectorSearch(queryEmbedding, [], 5)
      
      expect(results).toEqual([])
    })
    
    it('should return empty array for empty query embedding', () => {
      const results = vectorSearch([], mockChunks, 5)
      
      expect(results).toEqual([])
    })
    
    it('should return chunks in correct ranked order', () => {
      const queryEmbedding = [1, 0, 0]
      const results = vectorSearch(queryEmbedding, mockChunks, 10)
      
      expect(results).toHaveLength(3)
      expect(results[0].chunkId).toBe('chunk-1')
      expect(results[0].score).toBeCloseTo(1)
    })
    
    it('should respect topK parameter', () => {
      const queryEmbedding = [1, 0, 0]
      const results = vectorSearch(queryEmbedding, mockChunks, 2)
      
      expect(results).toHaveLength(2)
    })
    
    it('should skip chunks without embeddings', () => {
      const chunksWithoutEmbedding: StoredChunk[] = [
        { ...mockChunks[0], embedding: [] },
        ...mockChunks.slice(1),
      ]
      
      const queryEmbedding = [1, 0, 0]
      const results = vectorSearch(queryEmbedding, chunksWithoutEmbedding, 5)
      
      expect(results).toHaveLength(2)
    })
    
    it('should filter by threshold', () => {
      const queryEmbedding = [1, 0, 0]
      const results = vectorSearch(queryEmbedding, mockChunks, 10, 0.9)
      
      expect(results).toHaveLength(1)
      expect(results[0].chunkId).toBe('chunk-1')
    })
  })
})