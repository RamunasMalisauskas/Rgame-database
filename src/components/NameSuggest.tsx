import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { suggestGameNames, type CatalogName } from '../lib/catalog.ts'

type NameSuggestProps = {
  value: string
  disabled: boolean
  onChange: (value: string) => void
}

export function NameSuggest({ value, disabled, onChange }: NameSuggestProps) {
  const listId = useId()
  const [pickedName, setPickedName] = useState('')
  const [suggestions, setSuggestions] = useState<CatalogName[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const query = value.trim()
  const shown = open && query.length >= 2 && query !== pickedName && suggestions.length > 0

  useEffect(() => {
    if (query.length < 2 || query === pickedName) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void suggestGameNames(query, controller.signal)
        .then((items) => {
          if (controller.signal.aborted) return
          setSuggestions(items)
          setActive(0)
          setOpen(items.length > 0)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          if (controller.signal.aborted) return
          setSuggestions([])
          setOpen(false)
        })
    }, 220)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [pickedName, query])

  function choose(item: CatalogName) {
    setPickedName(item.name)
    onChange(item.name)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!shown) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      const item = suggestions[active]
      if (!item) return
      event.preventDefault()
      choose(item)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="name-suggest">
      <div className="name-suggest-input">
        <input
          value={value}
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={listId}
          aria-activedescendant={shown ? `${listId}-${active}` : undefined}
          autoComplete="off"
          onChange={(event) => {
            setPickedName('')
            onChange(event.target.value)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          onFocus={() => {
            if (query.length >= 2 && query !== pickedName && suggestions.length > 0) setOpen(true)
          }}
        />
        {shown ? (
          <ul id={listId} className="name-suggestions" role="listbox">
            {suggestions.map((item, index) => {
              const detail = detailOf(item)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(item)}
                  >
                    <span>{item.name}</span>
                    {detail ? <span className="hint">{detail}</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
      <p className="hint">Type a name to pick it from the catalog. The other fields stay yours.</p>
    </div>
  )
}

function detailOf(item: CatalogName): string {
  return [item.year, item.matchedName].filter((part) => part !== null && part !== '').join(' · ')
}
