import { GameCard } from "./GameCard.tsx";
import { gameKey } from "../lib/gameFunctions.ts";
import {
  sectionId,
  type ColumnRoles,
  type LocationGroup,
} from "../lib/games.ts";
import type { Game } from "../types.ts";

type GameListProps = {
  status: "loading" | "ready" | "error";
  hasGames: boolean;
  groups: LocationGroup[];
  games: Game[];
  columns: string[];
  roles: ColumnRoles;
  onOpen: (game: Game, index: number) => void;
  onEdit: (game: Game, index: number) => void;
};

export function GameList({
  status,
  hasGames,
  groups,
  games,
  columns,
  roles,
  onOpen,
  onEdit,
}: GameListProps) {
  if (status === "loading") {
    return (
      <ul className="grid" aria-hidden="true">
        <li className="card skeleton" />
        <li className="card skeleton" />
        <li className="card skeleton" />
      </ul>
    );
  }

  if (status !== "ready") return null;

  if (groups.length === 0) {
    return (
      <div className="empty">
        <h2>{hasGames ? "No games match" : "No games in the sheet yet"}</h2>
        <p>
          {hasGames
            ? "Try another name or tag."
            : "Add the first game and it will be written to the next row."}
        </p>
      </div>
    );
  }

  const indexOfGame = new Map(games.map((game, index) => [game, index]));

  return (
    <div className="sections">
      {groups.map((group) => {
        const headingId = sectionId(group.title);
        return (
          <section
            key={group.title}
            className="location-section"
            aria-labelledby={headingId}
          >
            <div className="section-head">
              <h2 id={headingId}>{group.title}</h2>
              <p>{group.games.length}</p>
            </div>
            <ul className="grid">
              {group.games.map((game) => {
                const index = indexOfGame.get(game) ?? -1;
                return (
                  <GameCard
                    key={gameKey(game, index)}
                    game={game}
                    columns={columns}
                    roles={roles}
                    onOpen={() => onOpen(game, index)}
                    onEdit={() => onEdit(game, index)}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
