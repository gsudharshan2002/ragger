import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from '@/components/ui/button'

describe('Button component', () => {
  it('should render with default variant', () => {
    render(<Button>Click me</Button>)
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })
  
  it('should render with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Outline Button')
    expect(button).toBeInTheDocument()
  })
  
  it('should render with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    
    expect(screen.getByRole('button')).toHaveTextContent('Small')
    
    rerender(<Button size="lg">Large</Button>)
    
    expect(screen.getByRole('button')).toHaveTextContent('Large')
  })
  
  it('should handle click events', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click</Button>)
    
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})