import { useState } from "react";
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
  const [dark, setDark] = useState(() => currentTheme() === "dark");

  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <div className="brand">
          <span>R_BoardGames manager</span>
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
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className="btn add-button"
          disabled={!canAdd}
          onClick={onAdd}
        >
          Add game
        </button>
        <div className="settings">
          <p className="settings-title">Settings</p>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => {
              const next = dark ? "light" : "dark";
              applyTheme(next);
              setDark(next === "dark");
            }}
          >
            {dark ? "Turn on lights" : "Turn off lights"}
          </button>
          <button
            type="button"
            className="btn secondary sm"
            aria-pressed={editingLocations}
            disabled={!canEditLocations}
            onClick={onToggleLocationEdit}
          >
            Edit locations
          </button>
        </div>
      </div>
    </aside>
  );
}
