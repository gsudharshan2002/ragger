import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { KbCard } from '@/components/knowledge-base/kb-card'

const mockKnowledgeBase = {
  id: 'kb-1',
  name: 'Test Knowledge Base',
  description: 'A test knowledge base for unit testing',
  tags: ['test', 'example'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  settings: {
    defaultChunkSize: 512,
    defaultChunkOverlap: 64,
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
  },
}

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: { stats: null } }),
  }),
  apiUpload: jest.fn(),
}))

describe('KbCard component', () => {
  it('should render knowledge base information', () => {
    render(<KbCard knowledgeBase={mockKnowledgeBase} index={0} />)
    
    expect(screen.getByText('Test Knowledge Base')).toBeInTheDocument()
    expect(screen.getByText('A test knowledge base for unit testing')).toBeInTheDocument()
  })
  
  it('should display tags', () => {
    render(<KbCard knowledgeBase={mockKnowledgeBase} index={0} />)
    
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('example')).toBeInTheDocument()
  })
})