import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders the title and the comparison prompt', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /preference ranker/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/which do you prefer/i)).toBeInTheDocument()
    expect(screen.getByText(/0 comparisons/i)).toBeInTheDocument()
  })

  it('records a choice and reflects it in the rankings', async () => {
    const user = userEvent.setup()
    render(<App />)

    const choices = screen.getAllByRole('button', { name: /^choose /i })
    expect(choices).toHaveLength(2)

    await user.click(choices[0])
    expect(screen.getByText(/·\s*1 comparison\b/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^rankings$/i }))
    const table = screen.getByRole('table')
    // header row + one row per song
    const rows = within(table).getAllByRole('row')
    expect(rows.length).toBeGreaterThan(2)
  })

  it('undoes the last choice', async () => {
    const user = userEvent.setup()
    render(<App />)

    const choices = screen.getAllByRole('button', { name: /^choose /i })
    await user.click(choices[0])
    expect(screen.getByText(/·\s*1 comparison\b/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /undo last/i }))
    expect(screen.getByText(/·\s*0 comparisons\b/i)).toBeInTheDocument()
  })

  it('shows an empty-state message in rankings before any comparison', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^rankings$/i }))
    expect(screen.getByText(/no comparisons yet/i)).toBeInTheDocument()
  })
})
