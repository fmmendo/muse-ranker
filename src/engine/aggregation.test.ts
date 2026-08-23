import {
  meanAggregate,
  topNAggregate,
  aggregateByGroup,
  type GroupMember,
} from './aggregation'

describe('meanAggregate', () => {
  it('averages member scores', () => {
    const agg = meanAggregate([
      { score: 1000 },
      { score: 1200 },
      { score: 800 },
    ])
    expect(agg.score).toBe(1000)
    expect(agg.count).toBe(3)
    expect(agg.interval95).toBeUndefined()
  })

  it('propagates intervals as sqrt(sum of squares)/k', () => {
    const agg = meanAggregate([
      { score: 1000, interval95: 30 },
      { score: 1000, interval95: 40 },
    ])
    // sqrt(30^2 + 40^2) / 2 = 50 / 2 = 25
    expect(agg.interval95).toBeCloseTo(25, 10)
  })

  it('drops the interval if any member lacks one', () => {
    const agg = meanAggregate([
      { score: 1000, interval95: 30 },
      { score: 1000 },
    ])
    expect(agg.interval95).toBeUndefined()
  })
})

describe('topNAggregate', () => {
  it('averages the top N by score', () => {
    const agg = topNAggregate(
      [{ score: 100 }, { score: 900 }, { score: 800 }, { score: 700 }],
      3,
    )
    expect(agg.score).toBeCloseTo((900 + 800 + 700) / 3, 10)
    expect(agg.count).toBe(3)
  })

  it('uses all members when there are fewer than N', () => {
    const agg = topNAggregate([{ score: 900 }, { score: 700 }], 3)
    expect(agg.count).toBe(2)
    expect(agg.score).toBe(800)
  })

  it('rewards peaks over consistency vs mean', () => {
    // Three bangers but lots of filler → low mean, high top-3.
    const peaky = [
      { score: 1500 },
      { score: 1500 },
      { score: 1500 },
      { score: 100 },
      { score: 100 },
      { score: 100 },
      { score: 100 },
      { score: 100 },
    ]
    const steady = [
      { score: 1000 },
      { score: 1000 },
      { score: 1000 },
      { score: 1000 },
    ]
    // steady wins on mean, peaky wins on top-3
    expect(meanAggregate(steady).score).toBeGreaterThan(
      meanAggregate(peaky).score,
    )
    expect(topNAggregate(peaky, 3).score).toBeGreaterThan(
      topNAggregate(steady, 3).score,
    )
  })
})

describe('aggregateByGroup', () => {
  const members: GroupMember[] = [
    { groupId: 'a', score: 1200 },
    { groupId: 'a', score: 1000 },
    { groupId: 'b', score: 900 },
    { groupId: 'b', score: 800, excluded: true },
  ]

  it('groups and aggregates, dropping excluded members', () => {
    const result = aggregateByGroup(members, 3)
    const a = result.find((g) => g.groupId === 'a')!
    const b = result.find((g) => g.groupId === 'b')!
    expect(a.mean.score).toBe(1100)
    expect(a.mean.count).toBe(2)
    // b's excluded (bonus) member is dropped
    expect(b.mean.score).toBe(900)
    expect(b.mean.count).toBe(1)
  })
})
