const CATALOG_KINDS = new Set(['board_game', 'expansion', 'card_game'])

export type CatalogName = {
  id: string
  name: string
  year: number | null
  matchedName: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function catalogName(value: unknown): CatalogName | null {
  const record = asRecord(value)
  if (!record) return null
  if (typeof record.kind !== 'string' || !CATALOG_KINDS.has(record.kind)) return null
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null
  const name = record.name.trim()
  if (!name) return null
  const year = typeof record.year_published === 'number' ? record.year_published : null
  const matchedName = typeof record.matched_name === 'string' && record.matched_name.trim() !== name
    ? record.matched_name.trim()
    : null
  return { id: record.id, name, year, matchedName }
}

export async function suggestGameNames(query: string, signal: AbortSignal): Promise<CatalogName[]> {
  const q = query.trim().slice(0, 80)
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, limit: '8' })
  const response = await fetch(`/catalog/v1/items/suggest?${params}`, { signal })
  if (!response.ok) return []
  const payload: unknown = await response.json()
  const items = asRecord(payload)?.items
  if (!Array.isArray(items)) return []
  return items.map(catalogName).filter((item): item is CatalogName => item !== null)
}
