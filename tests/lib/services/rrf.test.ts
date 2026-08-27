import { rrfFusion } from '@/lib/services/rrf'
import type { VectorResult, BM25Result, StoredChunk } from '@/lib/types'

describe('rrf', () => {
  const mockChunk: StoredChunk = {
    id: 'chunk-1',
    documentId: 'doc-1',
    documentName: 'Document 1',
    page: 1,
    content: 'Test content',
    tokenCount: 10,
    startOffset: 0,
    endOffset: 10,
  }
  
  const mockVectorResults: VectorResult[] = [
    { chunkId: 'chunk-1', score: 0.9, rank: 1, chunk: mockChunk },
    { chunkId: 'chunk-2', score: 0.8, rank: 2, chunk: { ...mockChunk, id: 'chunk-2' } },
  ]
  
  const mockBM25Results: BM25Result[] = [
    { chunkId: 'chunk-1', score: 0.85, rank: 1, chunk: mockChunk, queryTerms: ['test'], termFreqs: {} },
    { chunkId: 'chunk-3', score: 0.7, rank: 2, chunk: { ...mockChunk, id: 'chunk-3' }, queryTerms: ['test'], termFreqs: {} },
  ]
  
  describe('rrfFusion', () => {
    it('should return empty array for empty inputs', () => {
      expect(rrfFusion([], [], 60)).toEqual([])
    })
    
    it('should combine vector and bm25 results', () => {
      const results = rrfFusion(mockVectorResults, mockBM25Results, 60)
      
      expect(results).toHaveLength(3)
      expect(results[0].chunkId).toBe('chunk-1')
    })
    
    it('should correctly calculate RRF scores', () => {
      const results = rrfFusion(mockVectorResults, mockBM25Results, 60)
      
      const chunk1 = results.find(r => r.chunkId === 'chunk-1')
      expect(chunk1).toBeDefined()
      expect(chunk1?.rrfScore).toBeGreaterThan(0)
      expect(chunk1?.vectorRank).toBe(1)
      expect(chunk1?.bm25Rank).toBe(1)
    })
    
    it('should apply weights to vector and bm25 scores', () => {
      const resultsWeighted = rrfFusion(mockVectorResults, mockBM25Results, 60, 2.0, 0.5)
      
      const chunk1Weighted = resultsWeighted.find(r => r.chunkId === 'chunk-1')
      expect(chunk1Weighted?.vectorScore).toBeCloseTo(0.9)
      expect(chunk1Weighted?.bm25Score).toBeCloseTo(0.85)
    })
    
    it('should sort results by RRF score descending', () => {
      const results = rrfFusion(mockVectorResults, mockBM25Results, 60)
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].rrfScore).toBeGreaterThanOrEqual(results[i].rrfScore)
      }
    })
    
    it('should handle chunks appearing in only one search', () => {
      const vectorOnly: VectorResult[] = [
        { chunkId: 'unique-vector', score: 0.5, rank: 1, chunk: { ...mockChunk, id: 'unique-vector' } },
      ]
      
      const results = rrfFusion(vectorOnly, mockBM25Results, 60)
      
      expect(results.find(r => r.chunkId === 'unique-vector')).toBeDefined()
      expect(results.find(r => r.vectorRank)).toBeDefined()
    })
    
    it('should have bm25Rank for chunks in bm25 results', () => {
      const results = rrfFusion(mockVectorResults, mockBM25Results, 60)
      
      const chunk1 = results.find(r => r.chunkId === 'chunk-1')
      expect(chunk1?.bm25Rank).toBe(1)
    })
  })
})