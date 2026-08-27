import { createTraceId, createRunId, createTraceEvent, saveTrace, getTrace } from '@/lib/services/trace-service'
import type { FullTrace, TraceEvent } from '@/lib/types'

describe('trace-service', () => {
  describe('createTraceId', () => {
    it('should generate a trace ID with correct prefix', () => {
      const traceId = createTraceId()
      
      expect(traceId).toMatch(/^trace_\w+$/)
      expect(typeof traceId).toBe('string')
    })
  })
  
  describe('createRunId', () => {
    it('should generate a run ID with correct prefix', () => {
      const runId = createRunId()
      
      expect(runId).toMatch(/^run_\w+$/)
      expect(typeof runId).toBe('string')
    })
  })
  
  describe('createTraceEvent', () => {
    it('should create a trace event with all required fields', () => {
      const event = createTraceEvent('trace-1', 'run-1', 'query', 'query.started', { query: 'test' })
      
      expect(event.id).toBeDefined()
      expect(event.traceId).toBe('trace-1')
      expect(event.runId).toBe('run-1')
      expect(event.stage).toBe('query')
      expect(event.event).toBe('query.started')
      expect(event.timestamp).toBeDefined()
      expect(event.data).toEqual({ query: 'test' })
    })
    
    it('should generate unique event IDs', () => {
      const event1 = createTraceEvent('trace-1', 'run-1', 'query', 'query.started', {})
      const event2 = createTraceEvent('trace-1', 'run-1', 'query', 'query.started', {})
      
      expect(event1.id).not.toBe(event2.id)
    })
  })
  
  describe('saveTrace and getTrace', () => {
    it('should save and retrieve a trace', async () => {
      const trace: FullTrace = {
        id: 'trace-test-1',
        runId: 'run-test-1',
        sessionId: 'session-test-1',
        requestId: 'request-test-1',
        timestamp: new Date().toISOString(),
        query: 'test query',
        strategy: 'hybrid-rrf',
        config: {} as any,
        events: [],
        queryProcessing: {
          originalQuery: 'test query',
          tokenCount: 2,
          processingDurationMs: 100,
        },
        context: {
          chunks: [],
          totalTokens: 0,
          chunkCount: 0,
          documentCount: 0,
        },
        prompt: {
          system: '',
          context: '',
          user: 'test query',
          systemTokens: 0,
          contextTokens: 0,
          userTokens: 2,
          totalTokens: 2,
        },
        llm: {
          provider: 'groq',
          model: 'test-model',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          latencyMs: 100,
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          answer: 'test answer',
          status: 'completed',
        },
        sources: [],
        totalLatencyMs: 100,
        status: 'completed',
      }
      
      await saveTrace(trace)
      const retrieved = await getTrace(trace.id)
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(trace.id)
      expect(retrieved?.query).toBe('test query')
    })
  })
})