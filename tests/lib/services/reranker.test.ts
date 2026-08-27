import { rerankChunks, isRerankerConfigured } from '@/lib/services/reranker'
import type { StoredChunk } from '@/lib/types'

describe('reranker', () => {
  const createMockChunk = (id: string, content: string): StoredChunk => ({
    id,
    documentId: 'doc-1',
    documentName: 'Document 1',
    page: 1,
    content,
    tokenCount: 10,
    startOffset: 0,
    endOffset: 10,
  })
  
  describe('isRerankerConfigured', () => {
    it('should return boolean', () => {
      expect(typeof isRerankerConfigured()).toBe('boolean')
    })
  })
  
  describe('rerankChunks', () => {
    beforeEach(() => {
      jest.mock('@/lib/services/settings', () => ({
        getSettings: jest.fn().mockResolvedValue({ embeddingApiKey: 'test-key' }),
      }))
    })
    
    it('should return empty array for empty chunks', async () => {
      const results = await rerankChunks('test query', [], 10, 5)
      expect(results).toEqual([])
    })
    
    it('should return reranked results', async () => {
      const chunks = [
        createMockChunk('chunk-1', 'Machine learning is a field of AI.'),
        createMockChunk('chunk-2', 'This document is about something else entirely.'),
      ]
      
      const results = await rerankChunks('machine learning AI', chunks, 10, 5)
      
      expect(results).toHaveLength(2)
      expect(results[0].rank).toBe(1)
    })
    
    it('should respect topN parameter', async () => {
      const chunks = Array.from({ length: 10 }, (_, i) =>
        createMockChunk(`chunk-${i}`, `Content ${i}`)
      )
      
      const results = await rerankChunks('test', chunks, 10, 3)
      
      expect(results).toHaveLength(3)
    })
    
    it('should rank by relevance score', async () => {
      const chunks = [
        createMockChunk('chunk-1', 'Relevant content about the query'),
        createMockChunk('chunk-2', 'Irrelevant content here'),
      ]
      
      const results = await rerankChunks('relevant content', chunks, 10, 5)
      
      expect(results[0].rerankScore).toBeGreaterThanOrEqual(results[1].rerankScore)
    })
  })
})