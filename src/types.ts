export type CellValue = string | number | boolean | null

export type Game = {
  id: string
} & Record<string, CellValue>

export type ColumnSource = 'sheet' | 'default'

export type Library = {
  games: Game[]
  columns: string[]
  columnSource: ColumnSource
  writable: boolean
}
