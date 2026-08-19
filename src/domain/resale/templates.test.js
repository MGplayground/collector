import { describe, expect, it } from 'vitest'
import { compose, gaps, remainingChars, render, toDepopText, validate } from './templates'
import { DEPOP } from './types'

const item = (over = {}) => ({
  name: 'Detroit Jacket', category: 'clothing', condition: 'good',
  attributes: { brand: 'Carhartt', size: 'L', colour: 'brown' }, ...over,
})

const template = (over = {}) => ({
  title_template: '{{brand}} {{name}} — {{size}}',
  description_template: 'Condition: {{condition}}. Colour: {{colour}}.',
  hashtags: ['carhartt', 'vintage', 'workwear'],
  ...over,
})

describe('render', () => {
  it('resolves from attributes and top-level fields', () => {
    expect(render('{{brand}} {{name}}', item()).text).toBe('Carhartt Detroit Jacket')
  })

  it('reports unresolved placeholders instead of leaving them in the copy', () => {
    const out = render('{{brand}} {{waist}}', item())
    expect(out.unresolved).toEqual(['waist'])
    expect(out.text).not.toMatch(/\{\{/)
  })

  it('drops a separator left dangling by a missing value', () => {
    expect(render('{{brand}} {{missing}} {{name}}', item()).text).toBe('Carhartt Detroit Jacket')
    expect(render('{{name}} — {{missing}}', item()).text).toBe('Detroit Jacket')
  })

  it('prefers attributes over top-level fields on a name clash', () => {
    expect(render('{{name}}', item({ attributes: { name: 'Override' } })).text).toBe('Override')
  })
})

describe('compose', () => {
  it('builds title, description and hashtags', () => {
    const c = compose(template(), item())
    expect(c.title).toBe('Carhartt Detroit Jacket — L')
    expect(c.description).toBe('Condition: good. Colour: brown.')
    expect(c.hashtags).toEqual(['carhartt', 'vintage', 'workwear'])
  })

  it('caps hashtags at what Depop accepts', () => {
    const c = compose(template({ hashtags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }), item())
    expect(c.hashtags).toHaveLength(DEPOP.MAX_HASHTAGS)
  })
})

describe('toDepopText', () => {
  // Depop has one combined field, so this is what actually gets pasted.
  it('flattens into one string with hashes added', () => {
    const text = toDepopText({ title: 'A', description: 'B', hashtags: ['x', '#y'] })
    expect(text).toBe('A\n\nB\n\n#x #y')
  })

  it('skips empty sections rather than leaving blank gaps', () => {
    expect(toDepopText({ title: 'A', description: '', hashtags: [] })).toBe('A')
  })
})

describe('validate', () => {
  it('passes a normal listing', () => {
    expect(validate(compose(template(), item()))).toEqual([])
  })

  it('catches an empty title', () => {
    const issues = validate({ title: '', description: 'x', hashtags: [] })
    expect(issues.join(' ')).toMatch(/Title is empty/)
  })

  // The limit applies to the combined field including hashtags, not to the
  // description alone — that is the part easy to get wrong.
  it('measures the whole combined field against the 1000 character limit', () => {
    const issues = validate({
      title: 'x'.repeat(500), description: 'y'.repeat(500), hashtags: ['tag'],
    })
    expect(issues.join(' ')).toMatch(/Too long for Depop/)
  })

  it('accepts something just inside the limit', () => {
    expect(validate({ title: 'x'.repeat(900), description: '', hashtags: [] })).toEqual([])
  })

  // render() strips placeholders it cannot fill, so the copy is publishable.
  // Reporting them as errors would block a listing over a missing measurement.
  it('does not block on a placeholder the item had no value for', () => {
    const composed = compose(template({ description_template: 'Waist {{waist}}.' }), item())
    expect(validate(composed)).toEqual([])
    expect(gaps(composed)).toContain('waist')
  })

  it('does block on a literal placeholder typed into the copy by hand', () => {
    const issues = validate({ title: 'Carhartt {{brand}}', description: 'x', hashtags: [] })
    expect(issues.join(' ')).toMatch(/\{\{brand\}\}/)
  })
})

describe('remainingChars', () => {
  it('counts down and goes negative when over', () => {
    expect(remainingChars({ title: 'abc', description: '', hashtags: [] }))
      .toBe(DEPOP.DESCRIPTION_LIMIT - 3)
    expect(remainingChars({ title: 'x'.repeat(1200), description: '', hashtags: [] }))
      .toBeLessThan(0)
  })
})
