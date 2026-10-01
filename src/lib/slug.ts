/**
 * Identifier derivation for tables — mirrors `derive_slug` / `KEY_RE` in
 * platform/app/core/tables/schema.py so the UI can predict what the backend will do.
 *
 * Display names are free-form (any language). Identifiers (table slug, column key) become
 * LLM tool names and parameter names, which must be ASCII. We auto-derive only when every
 * letter in the name survives the trip to ASCII (accents fold: "Café" → "cafe"). A name with
 * non-Latin letters (Persian, Cyrillic, CJK, …) returns null and the UI asks for an explicit key.
 */

export const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/
export const KEY_RULE_MSG = "lowercase English letters, digits or underscores; must start with a letter"

const MAX_LEN = 40

export function deriveSlug(name: string): string | null {
  const decomposed = name.normalize("NFKD")
  // Any non-ASCII letter left after decomposition means a whole script would be dropped.
  for (const ch of decomposed) {
    if (ch.charCodeAt(0) > 127 && /\p{L}/u.test(ch)) return null
  }
  const ascii = decomposed.replace(/[^\x00-\x7f]/g, "")
  let cleaned = ascii.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, MAX_LEN)
  if (!cleaned) return null
  if (/^[0-9]/.test(cleaned)) cleaned = `t_${cleaned}`.slice(0, MAX_LEN)
  return cleaned
}

/** True when the name needs the user to type an explicit English key. */
export function needsExplicitKey(name: string): boolean {
  return name.trim().length > 0 && deriveSlug(name) === null
}

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key.trim())
}

/** Make `key` unique against `taken` by appending _2, _3, … (keeps within 40 chars). */
export function uniqueKey(key: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  if (!set.has(key)) return key
  for (let n = 2; ; n++) {
    const candidate = `${key.slice(0, MAX_LEN - 1 - String(n).length)}_${n}`
    if (!set.has(candidate)) return candidate
  }
}
