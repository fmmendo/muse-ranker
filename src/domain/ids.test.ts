import { slugify, collectionId, groupId, itemId } from './ids'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Citizen Erased')).toBe('citizen-erased')
  })

  it('expands ampersands to "and"', () => {
    expect(slugify('The Sickness in You & I')).toBe('the-sickness-in-you-and-i')
  })

  it('strips punctuation and collapses separators', () => {
    expect(slugify('Map of the Problematique!!!')).toBe(
      'map-of-the-problematique',
    )
  })

  it('strips accents', () => {
    expect(slugify('Café Motörhead')).toBe('cafe-motorhead')
  })

  it('trims leading/trailing separators', () => {
    expect(slugify('  (Hush)  ')).toBe('hush')
  })
})

describe('id constructors', () => {
  it('namespaces ids by type', () => {
    expect(collectionId('Muse')).toBe('col:muse')
    expect(groupId('Muse', 'Absolution')).toBe('grp:muse:absolution')
    expect(itemId('Muse', 'Absolution', 'Stockholm Syndrome')).toBe(
      'itm:muse:absolution:stockholm-syndrome',
    )
  })
})
