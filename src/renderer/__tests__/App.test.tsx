import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'

describe('App', () => {
  it('renders Deskflow heading', () => {
    render(<App />)
    expect(screen.getByText('Deskflow')).toBeInTheDocument()
  })
})
