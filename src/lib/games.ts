import type { CellValue, Game } from "../types.ts";

export const DEFAULT_COLUMNS = [
  "id",
  "name",
  "rating",
  "tag",
  "location",
  "played",
  "willing to sell",
];

export const LOCATIONS = [
  "Vilnius",
  "Niauri",
  "At Friends",
  "Preordered",
] as const;

const NAME_KEYS = ["name", "title", "game", "gamename", "boardgame"];
const TAG_KEYS = ["tag", "tags", "category", "status", "genre"];
const NOTES_KEYS = [
  "notes",
  "note",
  "description",
  "comment",
  "comments",
  "rules",
];

export type ColumnRoles = {
  id: string;
  name: string | null;
  tag: string | null;
  location: string | null;
};

export function textOf(value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function coerce(value: unknown): CellValue {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return String(value);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(columns: string[], candidates: string[]): string | null {
  const byKey = new Map(
    columns.map((column) => [normalizeKey(column), column]),
  );
  for (const candidate of candidates) {
    const match = byKey.get(candidate);
    if (match) return match;
  }
  return null;
}

export function normalizeGame(raw: Record<string, unknown>): Game {
  const game: Record<string, CellValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    game[key] = coerce(value);
  }
  const idKey = Object.keys(game).find((key) => normalizeKey(key) === "id");
  return { ...game, id: idKey ? textOf(game[idKey]) : "" };
}

export function columnsFromGames(games: Game[]): string[] {
  const columns: string[] = [];
  for (const game of games) {
    const hasSeparateId = Object.keys(game).some(
      (key) => key !== "id" && normalizeKey(key) === "id",
    );
    for (const key of Object.keys(game)) {
      if (!key || columns.includes(key)) continue;
      if (key === "id" && hasSeparateId) continue;
      columns.push(key);
    }
  }
  return columns;
}

export function columnRoles(columns: string[]): ColumnRoles {
  return {
    id: findColumn(columns, ["id"]) ?? "id",
    name: findColumn(columns, NAME_KEYS),
    tag: findColumn(columns, TAG_KEYS),
    location: findColumn(columns, ["location", "place", "where"]),
  };
}

export function isLocationColumn(key: string): boolean {
  return normalizeKey(key) === "location";
}

const YES_NO_KEYS = ["played", "willingtosell"];

export function isYesNoColumn(key: string): boolean {
  return YES_NO_KEYS.includes(normalizeKey(key));
}

export function yesNoValue(value: string): "" | "yes" | "no" {
  const key = value.trim().toLowerCase();
  if (key === "yes") return "yes";
  if (key === "no") return "no";
  return "";
}

export function yesNoLabel(value: string): string {
  const key = yesNoValue(value);
  if (key === "yes") return "Yes";
  if (key === "no") return "No";
  return "—";
}

export function sectionId(title: string): string {
  return `location-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function locationSection(value: string): string {
  const key = value.trim().toLowerCase();
  if (!key) return "No location";
  if (key === "vilnius") return "Vilnius";
  if (key === "niauri") return "Niauri";
  if (key === "preordered") return "Preordered";
  if (key === "at friend" || key.startsWith("at ")) return "At Friends";
  return value.trim();
}

export function isPreordered(game: Game, roles: ColumnRoles): boolean {
  if (!roles.tag) return false;
  return splitTags(textOf(game[roles.tag])).some(
    (tag) => tag.toLowerCase() === "preordered",
  );
}

export function sectionForGame(game: Game, roles: ColumnRoles): string {
  if (isPreordered(game, roles)) return "Preordered";
  const raw = roles.location ? textOf(game[roles.location]).trim() : "";
  return roles.location ? locationSection(raw) : "Library";
}

export function friendLocationTag(game: Game, roles: ColumnRoles): string {
  if (!roles.location) return "";
  const raw = textOf(game[roles.location]).trim();
  if (locationSection(raw) !== "At Friends") return "";
  return raw;
}

export function locationChoices(current: string): string[] {
  const trimmed = current.trim();
  const known = LOCATIONS.some(
    (item) => item.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!trimmed || known) return [...LOCATIONS];
  return [trimmed, ...LOCATIONS];
}

export type LocationGroup = {
  title: string;
  games: Game[];
};

export function groupByLocation(
  games: Game[],
  roles: ColumnRoles,
): LocationGroup[] {
  const buckets = new Map<string, Game[]>(
    LOCATIONS.map((title) => [title, []]),
  );
  const extraOrder: string[] = [];
  for (const game of games) {
    const title = sectionForGame(game, roles);
    const existing = buckets.get(title);
    if (existing) {
      existing.push(game);
    } else {
      buckets.set(title, [game]);
      extraOrder.push(title);
    }
  }
  const titles = roles.location ? [...LOCATIONS, ...extraOrder] : ["Library"];
  return titles
    .map((title) => ({
      title,
      games: [...(buckets.get(title) ?? [])].sort((a, b) =>
        titleOf(a, roles).localeCompare(titleOf(b, roles), undefined, {
          sensitivity: "base",
        }),
      ),
    }))
    .filter((group) => group.games.length > 0);
}

export function labelFor(key: string): string {
  if (/\s/.test(key)) return key;
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function isLongText(key: string): boolean {
  return NOTES_KEYS.includes(normalizeKey(key));
}

export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function columnNamed(
  columns: string[],
  name: string,
): string | undefined {
  const key = normalizeKey(name);
  return columns.find((column) => normalizeKey(column) === key);
}

export function titleOf(game: Game, roles: ColumnRoles): string {
  if (roles.name) {
    const title = textOf(game[roles.name]).trim();
    if (title) return title;
  }
  for (const [key, value] of Object.entries(game)) {
    if (normalizeKey(key) === "id") continue;
    const text = textOf(value).trim();
    if (text) return text;
  }
  return game.id ? `Game ${game.id}` : "Untitled game";
}

export function pillsFor(
  game: Game,
  columns: string[],
  roles: ColumnRoles,
): string[] {
  const tags = roles.tag ? splitTags(textOf(game[roles.tag])) : [];
  const place = friendLocationTag(game, roles);
  const sellColumn = columnNamed(columns, "willingtosell");
  const playedColumn = columnNamed(columns, "played");
  const forSale =
    sellColumn && textOf(game[sellColumn]).trim().toLowerCase() === "yes"
      ? labelFor(sellColumn)
      : "";
  const unplayed =
    playedColumn && textOf(game[playedColumn]).trim().toLowerCase() === "no"
      ? "unplayed"
      : "";
  const extras = [place, forSale, unplayed].filter(
    (pill) =>
      pill && !tags.some((tag) => tag.toLowerCase() === pill.toLowerCase()),
  );
  return [...tags, ...extras];
}

function sortedTags(tags: Iterable<string>): string[] {
  const unique = new Map<string, string>();
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (!unique.has(key)) unique.set(key, tag);
  }
  return [...unique.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export function storedTags(games: Game[], roles: ColumnRoles): string[] {
  if (!roles.tag) return [];
  const tags: string[] = [];
  for (const game of games) tags.push(...splitTags(textOf(game[roles.tag])));
  return sortedTags(tags);
}

export function collectTags(
  games: Game[],
  columns: string[],
  roles: ColumnRoles,
): string[] {
  const tags: string[] = [];
  for (const game of games) tags.push(...pillsFor(game, columns, roles));
  return sortedTags(tags);
}

export function hasUntagged(
  games: Game[],
  columns: string[],
  roles: ColumnRoles,
): boolean {
  return games.some((game) => pillsFor(game, columns, roles).length === 0);
}

export function filterGames(
  games: Game[],
  query: string,
  tag: string,
  columns: string[],
  roles: ColumnRoles,
): Game[] {
  const needle = query.trim().toLowerCase();
  return games.filter((game) => {
    if (tag !== "all") {
      const tags = pillsFor(game, columns, roles);
      if (tag === "__untagged__") {
        if (tags.length > 0) return false;
      } else if (
        !tags.some((item) => item.toLowerCase() === tag.toLowerCase())
      ) {
        return false;
      }
    }
    if (!needle) return true;
    if (titleOf(game, roles).toLowerCase().includes(needle)) return true;
    return Object.entries(game).some(([key, value]) => {
      if (key === "id" && roles.id !== "id") return false;
      return textOf(value).toLowerCase().includes(needle);
    });
  });
}

export function formatCell(value: CellValue | undefined): string {
  const text = textOf(value).trim();
  if (!text) return "—";
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  return text;
}

export function draftFromGame(
  game: Game,
  columns: string[],
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const column of columns) draft[column] = textOf(game[column]);
  return draft;
}

export function emptyDraft(columns: string[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const column of columns) draft[column] = "";
  return draft;
}
