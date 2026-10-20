import { columnsFromGames, DEFAULT_COLUMNS, normalizeGame } from './games.ts'
import type { Game, Library } from '../types.ts'

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

type ScriptGame = Record<string, unknown>

type ScriptSuccess = {
  success: true
  id?: string
  game?: ScriptGame
  tag?: Cellish
  message?: string
}

type Cellish = string | number | boolean | null

function visibleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function messageFromHtml(html: string): string {
  const text = visibleHtml(html)
  const missing = text.match(/(?:funkcija nerasta|function not found)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/i)
  if (missing) {
    return `Google says the published web app has no ${missing[1]} function. The editor is not what this URL runs. Open the Apps Script project for this deployment, replace Code.gs with apps-script/Code.gs, save, then Deploy → Manage deployments → pencil on this web app → New version → Deploy.`
  }
  if (/sign in|accounts\.google|prisijung/i.test(text)) {
    return 'The script URL opened a Google sign-in page. In Apps Script, set Who has access to Anyone, deploy a new version, and open the URL in a private window until it shows JSON.'
  }
  const detail = text.replace(/^Klaida\s*/i, '').slice(0, 240)
  if (detail) return `The web app returned an error page: ${detail}`
  return 'The script URL opened a Google page instead of JSON.'
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed || trimmed.startsWith('<')) {
    throw new ApiError(messageFromHtml(trimmed))
  }
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    throw new ApiError('The script did not return JSON.')
  }
}

async function request(init?: RequestInit): Promise<unknown> {
  if (!SCRIPT_URL) {
    throw new ApiError('Missing VITE_SCRIPT_URL. Add it to .env.local and restart the dev server.')
  }
  try {
    const response = await fetch(SCRIPT_URL, init)
    return await parseBody(response)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(
      'Could not reach the Google script. Set Who has access to Anyone and deploy a new version. A private web app redirects to Google sign-in, which the browser blocks.',
    )
  }
}

function cellish(value: unknown): Cellish | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function successPayload(value: unknown, fallback: string): ScriptSuccess {
  const record = asRecord(value)
  if (!record) throw new ApiError(fallback)
  if (record.success === false) {
    const message = typeof record.message === 'string' ? record.message : fallback
    throw new ApiError(message)
  }
  if (record.success !== true) throw new ApiError(fallback)
  const game = asRecord(record.game) ?? undefined
  return {
    success: true,
    id: record.id === undefined || record.id === null ? undefined : String(record.id),
    game,
    tag: cellish(record.tag),
    message: typeof record.message === 'string' ? record.message : undefined,
  }
}

function gameFromResponse(payload: ScriptSuccess, fallback: Game): Game {
  if (!payload.game) return fallback
  const game = normalizeGame(payload.game)
  return game.id ? game : { ...game, id: payload.id ?? fallback.id }
}

export async function getLibrary(): Promise<Library> {
  const payload = asRecord(await request())
  if (!payload || !Array.isArray(payload.data)) {
    throw new ApiError('The script response did not include a data list.')
  }
  const games = payload.data.map((row) => {
    const record = asRecord(row)
    return normalizeGame(record ?? {})
  })
  const reported = Array.isArray(payload.columns)
    ? payload.columns.filter((column): column is string => typeof column === 'string' && column.trim() !== '')
    : []
  const writable = reported.length > 0
  if (writable) {
    return { games, columns: reported, columnSource: 'sheet', writable }
  }
  const inferred = columnsFromGames(games)
  if (inferred.length > 0) {
    return { games, columns: inferred, columnSource: 'sheet', writable }
  }
  return { games, columns: DEFAULT_COLUMNS, columnSource: 'default', writable }
}

async function post(body: Record<string, unknown>, fallback: string): Promise<ScriptSuccess> {
  const payload = await request({
    method: 'POST',
    // Apps Script does not answer the preflight that application/json triggers.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  return successPayload(payload, fallback)
}

export async function updateTag(id: string, tag: string, current: Game): Promise<Game> {
  const payload = await post({ id, tag }, 'Could not update the tag.')
  if (payload.game) return gameFromResponse(payload, current)
  const tagKey = Object.keys(current).find((key) => key.toLowerCase() === 'tag') ?? 'tag'
  return { ...current, [tagKey]: payload.tag ?? tag, id }
}

export async function createGame(game: Record<string, string>): Promise<Game> {
  const payload = await post({ action: 'create', game }, 'Could not add the game.')
  if (!payload.game) throw new ApiError('The script added a row but did not return the game.')
  return gameFromResponse(payload, { ...game, id: payload.id ?? '' })
}

export async function updateGame(gameId: string, game: Record<string, string>, current: Game): Promise<Game> {
  // gameId stays off the top-level id field so an older script cannot clear the tag.
  const payload = await post({ action: 'update', gameId, game }, 'Could not save the game.')
  if (payload.game) return gameFromResponse(payload, { ...current, ...game, id: gameId })
  return { ...current, ...game, id: gameId }
}

export async function deleteGame(gameId: string): Promise<void> {
  await post({ action: 'delete', gameId }, 'Could not delete the game.')
}

export function explainWriteError(action: 'create' | 'update' | 'delete', error: unknown): string {
  const message = error instanceof Error ? error.message : 'Save failed.'
  const needsScript =
    message === 'Unknown action' ||
    message === 'Missing id or tag column' ||
    message === 'Missing id column' ||
    message === 'Game not found'
  if (!needsScript) return message
  const verb = action === 'create' ? 'add' : action === 'update' ? 'save' : 'delete'
  return `${message}. Paste apps-script/Code.gs into Apps Script and deploy a new version of this same web app, then ${verb} again.`
}
