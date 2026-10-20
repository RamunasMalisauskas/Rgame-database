import type { Dispatch, SetStateAction } from 'react'
import {
  createGame,
  deleteGame,
  explainWriteError,
  updateGame,
  updateTag,
} from './api.ts'
import {
  columnsFromGames,
  isPreordered,
  locationSection,
  sectionForGame,
  splitTags,
  textOf,
  type ColumnRoles,
} from './games.ts'
import type { ColumnSource, Game } from '../types.ts'

export type Panel =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'detail' | 'edit'; key: string }

type GameStore = {
  selected: Game | null
  panel: Panel
  columnSource: ColumnSource
  setGames: Dispatch<SetStateAction<Game[]>>
  setColumns: Dispatch<SetStateAction<string[]>>
  setColumnSource: Dispatch<SetStateAction<ColumnSource>>
  setPanel: Dispatch<SetStateAction<Panel>>
  setBusy: Dispatch<SetStateAction<boolean>>
  setWriteError: Dispatch<SetStateAction<string>>
}

export function gameKey(game: Game, index: number): string {
  return game.id ? `id:${game.id}` : `row:${index}`
}

export function loadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load games.'
}

export function libraryCount(ready: boolean, filtering: boolean, shown: number, total: number): string {
  if (!ready) return 'Loading'
  if (filtering) return `${shown} of ${total}`
  return `${total} ${total === 1 ? 'game' : 'games'}`
}

export function selectedGame(games: Game[], panel: Panel): Game | null {
  if (panel.mode === 'closed' || panel.mode === 'create') return null
  return games.find((game, index) => gameKey(game, index) === panel.key) ?? null
}

export function replaceGame(games: Game[], next: Game): Game[] {
  const index = games.findIndex((game) => game.id === next.id)
  if (index === -1) return [next, ...games]
  const copy = games.slice()
  copy[index] = next
  return copy
}

export function openGame(game: Game, index: number, store: Pick<GameStore, 'setWriteError' | 'setPanel'>): void {
  store.setWriteError('')
  store.setPanel({ mode: 'detail', key: gameKey(game, index) })
}

export function editGame(game: Game, index: number, store: Pick<GameStore, 'setWriteError' | 'setPanel'>): void {
  store.setWriteError('')
  store.setPanel({ mode: 'edit', key: gameKey(game, index) })
}

export async function saveTag(nextTag: string, store: GameStore): Promise<void> {
  if (!store.selected?.id) return
  store.setBusy(true)
  store.setWriteError('')
  try {
    const saved = await updateTag(store.selected.id, nextTag, store.selected)
    store.setGames((current) => replaceGame(current, saved))
  } catch (error) {
    store.setWriteError(error instanceof Error ? error.message : 'Could not update the tag.')
  } finally {
    store.setBusy(false)
  }
}

export async function saveGame(draft: Record<string, string>, store: GameStore): Promise<void> {
  store.setBusy(true)
  store.setWriteError('')
  try {
    if (store.panel.mode === 'create') {
      const created = await createGame(draft)
      store.setGames((current) => [...current, created])
      if (store.columnSource === 'default') {
        const inferred = columnsFromGames([created])
        if (inferred.length > 0) store.setColumns(inferred)
      }
      store.setColumnSource('sheet')
      store.setPanel(created.id ? { mode: 'detail', key: `id:${created.id}` } : { mode: 'closed' })
      return
    }
    if (store.selected?.id) {
      const saved = await updateGame(store.selected.id, draft, store.selected)
      store.setGames((current) => replaceGame(current, saved))
      store.setPanel({ mode: 'detail', key: `id:${saved.id}` })
    }
  } catch (error) {
    const action = store.panel.mode === 'create' ? 'create' : 'update'
    store.setWriteError(explainWriteError(action, error))
  } finally {
    store.setBusy(false)
  }
}

export function locationRenameDetail(title: string, games: Game[], roles: ColumnRoles): string {
  const members = games.filter((game) => sectionForGame(game, roles) === title)
  const count = `${members.length} ${members.length === 1 ? 'game' : 'games'}`
  if (title === locationSection('at friend')) {
    return `Replaces the place on ${count}. Names such as at Adomas become this name.`
  }
  if (title === 'Preordered' && members.some((game) => isPreordered(game, roles))) {
    return `Updates ${count}. The preordered tag is removed so they follow the new name.`
  }
  return `Updates the location of ${count}.`
}

export async function renameLocation(
  title: string,
  nextName: string,
  games: Game[],
  roles: ColumnRoles,
  store: Pick<GameStore, 'setGames' | 'setBusy' | 'setWriteError'>,
): Promise<boolean> {
  const locationColumn = roles.location
  const next = nextName.trim()
  if (!locationColumn || !next) return false
  if (next.toLowerCase() === title.toLowerCase() && locationSection(next) === title) return true

  const members = games.filter((game) => sectionForGame(game, roles) === title)
  const pending = members.filter((game) => game.id)
  const skipped = members.length - pending.length
  const dropPreordered = title === 'Preordered' && locationSection(next) !== 'Preordered'

  store.setBusy(true)
  store.setWriteError('')
  try {
    for (const game of pending) {
      const patch: Record<string, string> = { [locationColumn]: next }
      if (dropPreordered && roles.tag && isPreordered(game, roles)) {
        patch[roles.tag] = splitTags(textOf(game[roles.tag]))
          .filter((tag) => tag.toLowerCase() !== 'preordered')
          .join(', ')
      }
      const saved = await updateGame(game.id, patch, game)
      store.setGames((current) => replaceGame(current, saved))
    }
    if (skipped > 0) {
      const noun = skipped === 1 ? 'game has' : 'games have'
      store.setWriteError(`${skipped} ${noun} no id, so the sheet could not update ${skipped === 1 ? 'it' : 'them'}.`)
      return false
    }
    return true
  } catch (error) {
    store.setWriteError(explainWriteError('update', error))
    return false
  } finally {
    store.setBusy(false)
  }
}

export async function removeGame(store: GameStore): Promise<void> {
  if (!store.selected?.id) return
  const id = store.selected.id
  store.setBusy(true)
  store.setWriteError('')
  try {
    await deleteGame(id)
    store.setGames((current) => current.filter((game) => game.id !== id))
    store.setPanel({ mode: 'closed' })
  } catch (error) {
    store.setWriteError(explainWriteError('delete', error))
  } finally {
    store.setBusy(false)
  }
}
