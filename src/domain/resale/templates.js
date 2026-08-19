/**
 * Turning an item into listing copy.
 *
 * Depop takes one combined field, so `compose` produces title/description/
 * hashtags for our own use and `toDepopText` flattens them into the single
 * string you actually paste. Validation runs against that flattened string,
 * because that is what the 1000-character limit applies to.
 */

import { DEPOP } from './types'

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g

/**
 * Resolve {{placeholders}} against the item's top-level fields and its
 * attributes jsonb, attributes winning ties since they are the specific ones.
 */
export function render(template, item) {
  if (!template) return { text: '', unresolved: [] }

  const scope = { ...(item ?? {}), ...(item?.attributes ?? {}) }
  const unresolved = []

  const text = template.replace(PLACEHOLDER, (_match, key) => {
    const value = scope[key]
    if (value == null || value === '') {
      unresolved.push(key)
      return ''
    }
    return String(value)
  })

  return { text: tidy(text), unresolved }
}

/**
 * Clean up after a placeholder that resolved to nothing.
 *
 * "{{brand}} — {{size}}" with no size should read "Carhartt", not "Carhartt —".
 * Separators are only stripped when they are left dangling at either end; one
 * sitting between two real values is deliberate punctuation and stays put.
 */
function tidy(text) {
  return text
    .replace(/\s{2,}/g, ' ')        // runs of space left by removed values
    .replace(/\s+([,.])/g, '$1')    // space pushed in front of punctuation
    .trim()
    .replace(/^[\s,\u2013\u2014-]+/, '')   // separator with nothing before it
    .replace(/[\s,\u2013\u2014-]+$/, '')   // separator with nothing after it
    .trim()
}

export function compose(template, item) {
  const title = render(template?.title_template, item)
  const description = render(template?.description_template, item)

  return {
    title: title.text,
    description: description.text,
    hashtags: (template?.hashtags ?? []).slice(0, DEPOP.MAX_HASHTAGS),
    unresolved: [...new Set([...title.unresolved, ...description.unresolved])],
  }
}

/** The single string to paste into Depop. */
export function toDepopText({ title, description, hashtags = [] }) {
  const tags = hashtags
    .filter(Boolean)
    .map(t => (t.startsWith('#') ? t : `#${t}`))
    .join(' ')

  return [title, description, tags].filter(Boolean).join('\n\n').trim()
}

/**
 * Problems that would make this listing fail or get truncated on Depop.
 * Returns an array of human-readable strings; empty means good to go.
 */
export function validate(composed) {
  const issues = []
  const text = toDepopText(composed)

  if (!composed?.title?.trim()) issues.push('Title is empty.')

  if (text.length > DEPOP.DESCRIPTION_LIMIT) {
    issues.push(
      `Too long for Depop: ${text.length} characters including hashtags, ` +
      `limit is ${DEPOP.DESCRIPTION_LIMIT}.`
    )
  }

  if ((composed?.hashtags?.length ?? 0) > DEPOP.MAX_HASHTAGS) {
    issues.push(`Depop allows ${DEPOP.MAX_HASHTAGS} hashtags; this has ${composed.hashtags.length}.`)
  }

  // A literal {{...}} surviving into the output is an error — it means someone
  // typed it by hand, because render() strips the ones it resolves. Name them,
  // so the fix is obvious rather than a hunt through the copy.
  const literal = [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m => m[1])
  if (literal.length) {
    issues.push(
      `The copy still contains ${[...new Set(literal)].map(p => `{{${p}}}`).join(', ')}, ` +
      'which will publish exactly as written.'
    )
  }

  return issues
}

/**
 * Advisory, not blocking: placeholders the item had no value for.
 *
 * render() already removed them and tidied the gap, so the copy is publishable
 * — but an empty {{size}} usually means the item is missing a detail a buyer
 * wants, which is worth saying without standing in the way.
 */
export const gaps = composed => composed?.unresolved ?? []

/** Characters left before Depop truncates. Negative means over. */
export const remainingChars = composed =>
  DEPOP.DESCRIPTION_LIMIT - toDepopText(composed).length
