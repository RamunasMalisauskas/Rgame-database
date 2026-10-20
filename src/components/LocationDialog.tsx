import { useEffect, useId, useState, type FormEvent } from 'react'
import { locationSection } from '../lib/games.ts'

type LocationDialogProps = {
  title: string
  detail: string
  busy: boolean
  error: string
  onClose: () => void
  onSave: (name: string) => void
}

export function LocationDialog({ title, detail, busy, error, onClose, onSave }: LocationDialogProps) {
  const titleId = useId()
  const [name, setName] = useState(title)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = name.trim()
    if (!next) {
      setFormError('Enter a name.')
      return
    }
    if (locationSection(next) === title && next.toLowerCase() !== title.toLowerCase()) {
      setFormError(`This name still shows as ${title}.`)
      return
    }
    setFormError('')
    onSave(next)
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
            <p className="eyebrow">Location</p>
            <h2 id={titleId}>Rename {title}</h2>
          </div>
          <button type="button" className="btn secondary sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </header>
        <form className="dialog-body" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              disabled={busy}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
            <p className="hint">{detail}</p>
          </label>
          {formError ? <p className="form-error" role="alert">{formError}</p> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
