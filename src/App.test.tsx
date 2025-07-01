import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders Vite + React title', () => {
    render(<App />)
    const title = screen.getByText('Vite + React')
    expect(title).toBeInTheDocument()
  })

  it('renders count button with initial value 0', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    expect(button).toBeInTheDocument()
  })

  it('increments count when button is clicked', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    
    fireEvent.click(button)
    
    const updatedButton = screen.getByRole('button', { name: /count is 1/i })
    expect(updatedButton).toBeInTheDocument()
  })

  it('renders Vite and React logos', () => {
    render(<App />)
    const viteLogo = screen.getByAltText('Vite logo')
    const reactLogo = screen.getByAltText('React logo')
    
    expect(viteLogo).toBeInTheDocument()
    expect(reactLogo).toBeInTheDocument()
  })
})