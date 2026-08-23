import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { InMemoryRepository } from './data/repository'

const renderApp = (repository = new InMemoryRepository()) => ({
  repository,
  ...render(<App repository={repository} />),
})

describe('App', () => {
  it('renders the title and the comparison prompt', async () => {
    renderApp()
    expect(
      screen.getByRole('heading', { name: /preference ranker/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/which do you prefer/i)).toBeInTheDocument()
    expect(screen.getByText(/0 comparisons/i)).toBeInTheDocument()
  })

  it('records a choice and reflects it in the rankings', async () => {
    const user = userEvent.setup()
    renderApp()

    const choices = await screen.findAllByRole('button', { name: /^choose /i })
    expect(choices).toHaveLength(2)

    await user.click(choices[0])
    expect(screen.getByText(/·\s*1 comparison\b/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^rankings$/i }))
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows.length).toBeGreaterThan(2)
  })

  it('undoes the last choice', async () => {
    const user = userEvent.setup()
    renderApp()

    const choices = await screen.findAllByRole('button', { name: /^choose /i })
    await user.click(choices[0])
    expect(screen.getByText(/·\s*1 comparison\b/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /undo last/i }))
    expect(screen.getByText(/·\s*0 comparisons\b/i)).toBeInTheDocument()
  })

  it('persists comparisons across a remount (page reload)', async () => {
    const user = userEvent.setup()
    const { repository, unmount } = renderApp()

    const choices = await screen.findAllByRole('button', { name: /^choose /i })
    await user.click(choices[0])
    expect(screen.getByText(/·\s*1 comparison\b/i)).toBeInTheDocument()
    unmount()

    render(<App repository={repository} />)
    expect(await screen.findByText(/·\s*1 comparison\b/i)).toBeInTheDocument()
  })

  it('reset clears comparisons after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp()

    const choices = await screen.findAllByRole('button', { name: /^choose /i })
    await user.click(choices[0])
    await user.click(screen.getByRole('button', { name: /^reset$/i }))
    expect(screen.getByText(/·\s*0 comparisons\b/i)).toBeInTheDocument()

    confirmSpy.mockRestore()
  })

  it('shows an empty-state message in rankings before any comparison', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText(/which do you prefer/i)
    await user.click(screen.getByRole('button', { name: /^rankings$/i }))
    expect(screen.getByText(/no comparisons yet/i)).toBeInTheDocument()
  })
})
