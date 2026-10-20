import { useEffect, useRef, useState } from "react";
import { sectionId, type LocationGroup } from "../lib/games.ts";
import { applyTheme, currentTheme } from "../lib/theme.ts";

type FilterBarProps = {
  query: string;
  tag: string;
  tags: string[];
  groups: LocationGroup[];
  showTagFilter: boolean;
  showUntagged: boolean;
  canAdd: boolean;
  canEditLocations: boolean;
  editingLocations: boolean;
  onQueryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onAdd: () => void;
  onToggleLocationEdit: () => void;
  onEditLocation: (title: string) => void;
};

export function FilterBar({
  query,
  tag,
  tags,
  groups,
  showTagFilter,
  showUntagged,
  canAdd,
  canEditLocations,
  editingLocations,
  onQueryChange,
  onTagChange,
  onAdd,
  onToggleLocationEdit,
  onEditLocation,
}: FilterBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => currentTheme() === "dark");
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: PointerEvent) {
      if (!settingsRef.current?.contains(event.target as Node))
        setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span>R_BoardGames manager</span>
        <div className="settings" ref={settingsRef}>
          <button
            type="button"
            className="btn ghost sm icon-btn"
            aria-label="Settings"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <SettingsIcon />
          </button>
          {menuOpen ? (
            <div className="settings-menu" role="menu">
              <button
                type="button"
                className="btn btn-primary"
                role="menuitemcheckbox"
                aria-checked={dark}
                onClick={() => {
                  const next = dark ? "light" : "dark";
                  applyTheme(next);
                  setDark(next === "dark");
                }}
              >
                Dark theme
              </button>
              <button
                type="button"
                className="btn btn-primary"
                role="menuitem"
                aria-pressed={editingLocations}
                disabled={!canEditLocations}
                onClick={() => {
                  onToggleLocationEdit();
                  setMenuOpen(false);
                }}
              >
                Edit location
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <label className="field">
        Search
        <input
          value={query}
          placeholder="Name, tag, location…"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      {showTagFilter ? (
        <label className="field">
          Tag
          <select
            value={tag}
            onChange={(event) => onTagChange(event.target.value)}
          >
            <option value="all">All tags</option>
            {showUntagged ? (
              <option value="__untagged__">Untagged</option>
            ) : null}
            {tags.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <nav className="location-nav" aria-label="Jump to location">
        <label className="field">Location</label>
        {groups.map((group) => (
          <div className="location-item" key={group.title}>
            <a href={`#${sectionId(group.title)}`}>
              {group.title}
              <span className="badge">{group.games.length}</span>
            </a>
            {editingLocations ? (
              <button
                type="button"
                className="btn secondary sm location-edit"
                aria-label={`Edit ${group.title}`}
                onClick={() => onEditLocation(group.title)}
              >
                Edit
              </button>
            ) : null}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="btn add-button"
        disabled={!canAdd}
        onClick={onAdd}
      >
        Add game
      </button>
    </aside>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.07 1.25h1.86l.28 1.55c.41.17.8.39 1.16.67l1.46-.62 1.32 1.32-.62 1.46c.28.36.5.75.67 1.16l1.55.28v1.86l-1.55.28a4.7 4.7 0 0 1-.67 1.16l.62 1.46-1.32 1.32-1.46-.62a4.7 4.7 0 0 1-1.16.67l-.28 1.55H7.07l-.28-1.55a4.7 4.7 0 0 1-1.16-.67l-1.46.62-1.32-1.32.62-1.46a4.7 4.7 0 0 1-.67-1.16L1.25 8.93V7.07l1.55-.28c.17-.41.39-.8.67-1.16l-.62-1.46 1.32-1.32 1.46.62c.36-.28.75-.5 1.16-.67l.28-1.55ZM8 6.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z"
      />
    </svg>
  );
}
