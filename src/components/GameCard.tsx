import {
  columnNamed,
  labelFor,
  pillsFor,
  textOf,
  titleOf,
  type ColumnRoles,
} from "../lib/games.ts";
import type { Game } from "../types.ts";

type GameCardProps = {
  game: Game;
  columns: string[];
  roles: ColumnRoles;
  onOpen: () => void;
  onEdit: () => void;
};

export function GameCard({
  game,
  columns,
  roles,
  onOpen,
  onEdit,
}: GameCardProps) {
  const title = titleOf(game, roles);
  const ratingColumn = columnNamed(columns, "rating");
  const rating = ratingColumn ? textOf(game[ratingColumn]).trim() : "";
  const pills = pillsFor(game, columns, roles);
  const unplayed = pills.some(
    (pill) =>
      pill.toLowerCase() === "unplayed" || pill.toLowerCase() === "preordered",
  );

  return (
    <li className="card game-card">
      <button type="button" className="card-open" onClick={onOpen}>
        <span className="card-title">{title}</span>
        {ratingColumn && !unplayed ? (
          <span className="card-rating">
            <span className="rating-pill">{rating || "—"}</span>
            <span className="card-rating-label">{labelFor(ratingColumn)}</span>
          </span>
        ) : null}
        {pills.length > 0 ? (
          <span className="card-pills">
            {pills.map((tag) => (
              <span key={tag} className="pill">
                {tag}
              </span>
            ))}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="btn secondary sm card-edit"
        onClick={onEdit}
      >
        Edit
      </button>
    </li>
  );
}
