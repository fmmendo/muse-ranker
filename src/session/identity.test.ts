import { getUserId } from './identity'

describe('getUserId', () => {
  beforeEach(() => localStorage.clear())

  it('generates and persists a stable anonymous id', () => {
    const a = getUserId()
    const b = getUserId()
    expect(a).toBe(b)
    expect(a).toMatch(/[0-9a-f-]{36}/)
    expect(localStorage.getItem('ranker:userId')).toBe(a)
  })
})
