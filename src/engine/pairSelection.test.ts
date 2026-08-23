import { randomPair } from './pairSelection'

describe('randomPair', () => {
  it('throws with fewer than two items', () => {
    expect(() => randomPair([])).toThrow(/at least two/)
    expect(() => randomPair(['only'])).toThrow(/at least two/)
  })

  it('always returns two distinct items', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const random = (() => {
      const seq = [0.0, 0.99, 0.5, 0.5, 0.99, 0.0, 0.2, 0.2]
      let i = 0
      return () => seq[i++ % seq.length]
    })()
    for (let n = 0; n < 4; n++) {
      const [x, y] = randomPair(items, random)
      expect(x).not.toBe(y)
    }
  })

  it('can select the last item (no off-by-one exclusion)', () => {
    // random() = 0.99 -> i = last index; second draw 0 -> j = 0
    const [x, y] = randomPair(['a', 'b', 'c'], () => 0.99)
    expect(x).toBe('c')
    expect(y).not.toBe('c')
  })
})
