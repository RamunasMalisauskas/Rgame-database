import { useEffect, useMemo, useRef, useState } from 'react'
import { FilterBar } from './components/FilterBar.tsx'
import { GameDialog } from './components/GameDialog.tsx'
import { GameList } from './components/GameList.tsx'
import { LocationDialog } from './components/LocationDialog.tsx'
import {
  editGame,
  libraryCount,
  loadErrorMessage,
  locationRenameDetail,
  openGame,
  removeGame,
  renameLocation,
  saveGame,
  saveTag,
  selectedGame,
  type Panel,
} from './gameFunctions.ts'
import { getLibrary } from './lib/api.ts'
import {
  collectTags,
  columnRoles,
  filterGames,
  groupByLocation,
  hasUntagged,
  storedTags,
} from './lib/games.ts'
import type { ColumnSource, Game, Library } from './types.ts'
import './App.css'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnSource, setColumnSource] = useState<ColumnSource>('default')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [panel, setPanel] = useState<Panel>({ mode: 'closed' })
  const [busy, setBusy] = useState(false)
  const [writeError, setWriteError] = useState('')
  const [scriptWritable, setScriptWritable] = useState(true)
  const [editingLocations, setEditingLocations] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationError, setLocationError] = useState('')
  const requestRef = useRef(0)

  function acceptLibrary(requestId: number, library: Library) {
    if (requestId !== requestRef.current) return
    setGames(library.games)
    setColumns(library.columns)
    setColumnSource(library.columnSource)
    setScriptWritable(library.writable)
    setStatus('ready')
  }

  function acceptFailure(requestId: number, error: unknown) {
    if (requestId !== requestRef.current) return
    setStatus('error')
    setLoadError(loadErrorMessage(error))
  }

  function load() {
    const requestId = ++requestRef.current
    setStatus('loading')
    setLoadError('')
    void getLibrary().then(
      (library) => acceptLibrary(requestId, library),
      (error: unknown) => acceptFailure(requestId, error),
    )
  }

  useEffect(() => {
    const requestId = ++requestRef.current
    void getLibrary().then(
      (library) => acceptLibrary(requestId, library),
      (error: unknown) => acceptFailure(requestId, error),
    )
  }, [])

  const roles = useMemo(() => columnRoles(columns), [columns])
  const tags = useMemo(() => collectTags(games, columns, roles), [games, columns, roles])
  const sheetTags = useMemo(() => storedTags(games, roles), [games, roles])
  const filtered = useMemo(
    () => filterGames(games, query, tag, columns, roles),
    [games, query, tag, columns, roles],
  )
  const filtering = query.trim() !== '' || tag !== 'all'
  const groups = useMemo(() => groupByLocation(filtered, roles), [filtered, roles])
  const selected = useMemo(() => selectedGame(games, panel), [games, panel])
  const store = {
    selected,
    panel,
    columnSource,
    setGames,
    setColumns,
    setColumnSource,
    setPanel,
    setBusy,
    setWriteError,
  }

  return (
    <>
      <div className="app">
        <FilterBar
          query={query}
          tag={tag}
          tags={tags}
          groups={groups}
          showTagFilter={roles.tag !== null || tags.length > 0}
          showUntagged={hasUntagged(games, columns, roles)}
          canAdd={status === 'ready'}
          canEditLocations={status === 'ready' && roles.location !== null}
          editingLocations={editingLocations}
          onQueryChange={setQuery}
          onTagChange={setTag}
          onAdd={() => {
            setWriteError('')
            setPanel({ mode: 'create' })
          }}
          onToggleLocationEdit={() => setEditingLocations((current) => !current)}
          onEditLocation={(title) => {
            setLocationError('')
            setRenaming(title)
          }}
        />

        <main className="main">
          <header className="page-header">
            <h1>Board game library</h1>
            <span className="badge accent">{libraryCount(status === 'ready', filtering, filtered.length, games.length)}</span>
          </header>

          {status === 'ready' && !scriptWritable ? (
            <div className="banner" role="status">
              <p>
                This web app can load the sheet, but the published script has no save function.
                Replace Code.gs in that same project with apps-script/Code.gs, then publish a new version of this deployment.
              </p>
            </div>
          ) : null}

          {status === 'loading' ? <p className="hint" role="status">Loading games…</p> : null}

          {status === 'error' ? (
            <div className="banner" role="alert">
              <p>{loadError}</p>
              <button type="button" className="btn secondary" onClick={() => void load()}>Try again</button>
            </div>
          ) : null}

          <GameList
            status={status}
            hasGames={games.length > 0}
            groups={groups}
            games={games}
            columns={columns}
            roles={roles}
            onOpen={(game, index) => openGame(game, index, store)}
            onEdit={(game, index) => editGame(game, index, store)}
          />
        </main>
      </div>

      {panel.mode !== 'closed' && (panel.mode === 'create' || selected) ? (
        <GameDialog
          key={panel.mode === 'create' ? 'create' : `${panel.mode}:${panel.key}`}
          mode={panel.mode === 'create' ? 'create' : panel.mode}
          game={selected}
          columns={columns}
          roles={roles}
          tags={sheetTags}
          columnSource={columnSource}
          busy={busy}
          error={writeError}
          onClose={() => { if (!busy) setPanel({ mode: 'closed' }) }}
          onEdit={() => {
            if (panel.mode === 'detail') setPanel({ mode: 'edit', key: panel.key })
          }}
          onSaveTag={(nextTag) => void saveTag(nextTag, store)}
          onSave={(draft) => void saveGame(draft, store)}
          onDelete={() => void removeGame(store)}
        />
      ) : null}

      {renaming ? (
        <LocationDialog
          key={renaming}
          title={renaming}
          detail={locationRenameDetail(renaming, games, roles)}
          busy={locationBusy}
          error={locationError}
          onClose={() => { if (!locationBusy) setRenaming(null) }}
          onSave={(nextName) => {
            void renameLocation(renaming, nextName, games, roles, {
              setGames,
              setBusy: setLocationBusy,
              setWriteError: setLocationError,
            }).then((done) => {
              if (done) setRenaming(null)
            })
          }}
        />
      ) : null}
    </>
  )
}

export default App
