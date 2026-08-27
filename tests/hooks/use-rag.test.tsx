import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RagProvider, useRagContext } from '@/hooks/use-rag'

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ success: true, data: [] }),
  }),
  previewUrl: jest.fn(),
}))

jest.mock('@/lib/events', () => ({
  RagEventBus: jest.fn().mockImplementation(() => ({
    subscribe: jest.fn().mockReturnValue(() => {}),
    emit: jest.fn(),
  })),
  createEventBus: jest.fn().mockReturnValue({
    subscribe: jest.fn().mockReturnValue(() => {}),
    emit: jest.fn(),
  }),
}))

jest.mock('@/lib/utils', () => ({
  generateId: jest.fn().mockReturnValue('test-id-123'),
}))

const TestComponent = () => {
  const ctx = useRagContext()
  return (
    <div>
      <span data-testid="strategy">{ctx.strategy}</span>
      <span data-testid="documents-count">{ctx.session.documents.length}</span>
      <span data-testid="is-executing">{ctx.isExecuting.toString()}</span>
    </div>
  )
}

describe('useRag hook', () => {
  it('should provide default strategy', async () => {
    await act(async () => {
      render(
        <RagProvider>
          <TestComponent />
        </RagProvider>
      )
    })
    
    expect(screen.getByTestId('strategy')).toHaveTextContent('hybrid-rerank-mmr')
  })
  
  it('should initialize session with empty documents', async () => {
    await act(async () => {
      render(
        <RagProvider>
          <TestComponent />
        </RagProvider>
      )
    })
    
    expect(screen.getByTestId('documents-count')).toHaveTextContent('0')
    expect(screen.getByTestId('is-executing')).toHaveTextContent('false')
  })
  
  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useRagContext must be used within RagProvider')
    
    consoleError.mockRestore()
  })
})