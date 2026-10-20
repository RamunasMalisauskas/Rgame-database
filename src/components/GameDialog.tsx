import { useEffect, useId, useState, type FormEvent } from 'react'
import { NameSuggest } from './NameSuggest.tsx'
import {
  draftFromGame,
  emptyDraft,
  formatCell,
  isLocationColumn,
  isLongText,
  isYesNoColumn,
  labelFor,
  locationChoices,
  textOf,
  titleOf,
  yesNoLabel,
  yesNoValue,
  type ColumnRoles,
} from '../lib/games.ts'
import type { ColumnSource, Game } from '../types.ts'

export type DialogMode = 'detail' | 'edit' | 'create'

type GameDialogProps = {
  mode: DialogMode
  game: Game | null
  columns: string[]
  roles: ColumnRoles
  tags: string[]
  columnSource: ColumnSource
  busy: boolean
  error: string
  onClose: () => void
  onEdit: () => void
  onSaveTag: (tag: string) => void
  onSave: (draft: Record<string, string>) => void
  onDelete: () => void
}

export function GameDialog({
  mode,
  game,
  columns,
  roles,
  tags,
  columnSource,
  busy,
  error,
  onClose,
  onEdit,
  onSaveTag,
  onSave,
  onDelete,
}: GameDialogProps) {
  const titleId = useId()
  const tagListId = useId()
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    game ? draftFromGame(game, columns) : emptyDraft(columns),
  )
  const [tagValue, setTagValue] = useState(() =>
    roles.tag && game ? textOf(game[roles.tag]) : '',
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const fields = columns.filter((column) => column !== roles.id)
  const title = mode === 'create' ? 'Add a game' : game ? titleOf(game, roles) : 'Game'
  const savedTag = roles.tag && game ? textOf(game[roles.tag]) : ''
  const canIdentify = Boolean(game?.id)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (roles.name && !draft[roles.name]?.trim()) {
      setFormError('Enter a name.')
      return
    }
    const hasValue = fields.some((column) => draft[column]?.trim())
    if (!hasValue) {
      setFormError('Enter at least one field.')
      return
    }
    const payload: Record<string, string> = {}
    for (const column of fields) payload[column] = draft[column] ?? ''
    setFormError('')
    onSave(payload)
  }

  return (
    <div className="backdrop" onClick={() => { if (!busy) onClose() }}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-head">
          <div>
            <p className="eyebrow">{mode === 'create' ? 'New row' : 'Library'}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="btn secondary sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </header>

        {mode === 'detail' && game ? (
          <div className="dialog-body">
            <dl className="facts">
              {fields.filter((column) => column !== roles.tag).map((column) => (
                <div key={column}>
                  <dt>{labelFor(column)}</dt>
                  <dd className={isLongText(column) ? 'pre' : undefined}>
                    {isYesNoColumn(column)
                      ? yesNoLabel(textOf(game[column]))
                      : formatCell(game[column])}
                  </dd>
                </div>
              ))}
            </dl>

            {roles.tag ? (
              <form
                className="tag-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  onSaveTag(tagValue.trim())
                }}
              >
                <label htmlFor="tag-editor">Tag</label>
                <div className="tag-row">
                  <input
                    id="tag-editor"
                    list={tagListId}
                    value={tagValue}
                    disabled={!canIdentify || busy}
                    onChange={(event) => setTagValue(event.target.value)}
                  />
                  <button type="submit" className="btn sm" disabled={!canIdentify || busy || tagValue.trim() === savedTag}>
                    {busy && !confirmDelete ? 'Saving…' : 'Save tag'}
                  </button>
                </div>
                {!canIdentify ? <p className="hint">This row has no id, so the sheet cannot update it.</p> : null}
              </form>
            ) : null}

            {game.id ? <p className="game-id">#{game.id}</p> : null}
            {error ? <p className="form-error" role="alert">{error}</p> : null}

            <div className="dialog-actions">
              {confirmDelete ? (
                <>
                  <p>Delete this game from the sheet?</p>
                  <button type="button" className="btn danger" onClick={onDelete} disabled={busy || !canIdentify}>
                    {busy ? 'Deleting…' : 'Delete'}
                  </button>
                  <button type="button" className="btn secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn" onClick={onEdit} disabled={busy}>
                    Edit
                  </button>
                  <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)} disabled={busy || !canIdentify}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <form className="dialog-body" onSubmit={handleSubmit}>
            {columnSource === 'default' && mode === 'create' ? (
              <p className="hint">
                These fields are a starting set. Once the sheet loads, the form follows your header row.
              </p>
            ) : null}
            {fields.map((column) => (
              <label key={column} className="field">
                <span>{labelFor(column)}</span>
                {isLocationColumn(column) ? (
                  <select
                    value={draft[column] ?? ''}
                    disabled={busy}
                    onChange={(event) => setDraft((current) => ({ ...current, [column]: event.target.value }))}
                  >
                    <option value="">Choose a location</option>
                    {locationChoices(draft[column] ?? '').map((location) => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                ) : isYesNoColumn(column) ? (
                  <select
                    value={yesNoValue(draft[column] ?? '')}
                    disabled={busy}
                    onChange={(event) => setDraft((current) => ({ ...current, [column]: event.target.value }))}
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                ) : isLongText(column) ? (
                  <textarea
                    rows={4}
                    value={draft[column] ?? ''}
                    disabled={busy}
                    onChange={(event) => setDraft((current) => ({ ...current, [column]: event.target.value }))}
                  />
                ) : mode === 'create' && column === roles.name ? (
                  <NameSuggest
                    value={draft[column] ?? ''}
                    disabled={busy}
                    onChange={(value) => setDraft((current) => ({ ...current, [column]: value }))}
                  />
                ) : (
                  <input
                    value={draft[column] ?? ''}
                    list={column === roles.tag ? tagListId : undefined}
                    disabled={busy}
                    onChange={(event) => setDraft((current) => ({ ...current, [column]: event.target.value }))}
                  />
                )}
              </label>
            ))}
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <div className="dialog-actions">
              <button type="submit" className="btn" disabled={busy}>
                {busy ? 'Saving…' : mode === 'create' ? 'Add game' : 'Save changes'}
              </button>
              <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        )}
        <datalist id={tagListId}>
          {tags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
    </div>
  )
}
