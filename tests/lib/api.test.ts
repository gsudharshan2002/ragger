import { apiUrl, apiFetch, apiGet, apiPost, apiPut, apiDelete, apiUpload, previewUrl } from '@/lib/api'

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('apiUrl', () => {
    it('should construct URL with default base', () => {
      const url = apiUrl('/test')
      expect(url).toContain('http://localhost:8000')
      expect(url).toContain('/api/v1/test')
    })
    
    it('should add api prefix', () => {
      const url = apiUrl('documents')
      expect(url).toContain('/api/v1/documents')
    })
    
    it('should return full URLs unchanged', () => {
      const fullUrl = 'https://external.com/api'
      expect(apiUrl(fullUrl)).toBe(fullUrl)
    })
  })
  
  describe('apiFetch', () => {
    it('should call fetch with correct options', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      await apiFetch('/test', { method: 'POST' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/test'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    
    it('should set JSON content-type by default', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      await apiFetch('/test', { method: 'POST', body: { test: true } })
      
      const call = mockFetch.mock.calls[0][1]
      expect(call?.headers?.['Content-Type']).toBe('application/json')
    })
    
    it('should not set content-type for FormData', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      const formData = new FormData()
      await apiFetch('/upload', { method: 'POST', body: formData })
      
      const call = mockFetch.mock.calls[0][1]
      expect(call?.headers?.['Content-Type']).toBeUndefined()
    })
  })
  
  describe('apiGet', () => {
    it('should make GET request', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      await apiGet('/test')
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      )
    })
  })
  
  describe('apiPost', () => {
    it('should make POST request with body', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      await apiPost('/test', { data: 'test' })
      
      const result = mockFetch.mock.calls[0]
      expect(result[1]?.method).toBe('POST')
      expect(result[1]?.body).toBe(JSON.stringify({ data: 'test' }))
    })
    
    it('should stringify body', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      const body = { key: 'value' }
      await apiPost('/test', body)
      
      const call = mockFetch.mock.calls[0][1]
      expect(call?.body).toBe(JSON.stringify(body))
    })
  })
  
  describe('apiPut', () => {
    it('should make PUT request with body', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      await apiPut('/test', { data: 'updated' })
      
      const call = mockFetch.mock.calls[0][1]
      expect(call?.method).toBe('PUT')
    })
  })
  
  describe('apiDelete', () => {
    it('should make DELETE request', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      await apiDelete('/test')
      
      const call = mockFetch.mock.calls[0][1]
      expect(call?.method).toBe('DELETE')
    })
  })
  
  describe('apiUpload', () => {
    it('should make POST request with FormData', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      const formData = new FormData()
      await apiUpload('/upload', formData)
      
      const call = mockFetch.mock.calls[0][1]
      expect(call?.method).toBe('POST')
      expect(call?.body).toBe(formData)
    })
    
    it('should not set content-type for upload', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })
      
      global.fetch = mockFetch as any
      
      const formData = new FormData()
      await apiUpload('/upload', formData)
      
      const call = mockFetch.mock.calls[0][1]
      expect(call?.headers?.['Content-Type']).toBeUndefined()
    })
  })
  
  describe('previewUrl', () => {
    it('should generate preview URL for document', () => {
      const url = previewUrl('doc-123')
      expect(url).toContain('doc-123/preview')
    })
  })
})