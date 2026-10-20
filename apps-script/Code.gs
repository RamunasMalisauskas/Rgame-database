const sheetName = 'R. board game'
const sheetID = '10qcmXvnjAXrSSg6joND1RAK_0UVzptAOjaZFZxUT_1I'

function doGet() {
  const sheet = getSheet_()
  const data = sheet.getDataRange().getValues()
  if (data.length === 0) return json_({ data: [], columns: [] })

  const headers = data[0].map(headerName_)
  const rows = data.slice(1).filter(rowHasValue_)
  return json_({
    columns: headers.filter(Boolean),
    data: rows.map(function (row) {
      return rowToObject_(headers, row)
    }),
  })
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ success: false, message: 'Missing request body' })
    }
    const body = JSON.parse(e.postData.contents)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json_({ success: false, message: 'Missing request body' })
    }
    const sheet = getSheet_()
    const action = body.action || 'updateTag'

    if (action === 'updateTag') return updateTag_(sheet, body)
    if (action === 'create') return createGame_(sheet, body)
    if (action === 'update') return updateGame_(sheet, body)
    if (action === 'delete') return deleteGame_(sheet, body)
    return json_({ success: false, message: 'Unknown action' })
  } catch (error) {
    const message = error && typeof error.message === 'string' && error.message
      ? error.message
      : 'The script could not complete that request.'
    return json_({ success: false, message: message })
  }
}

function updateTag_(sheet, body) {
  const located = findRow_(sheet, body.id)
  if (located.error) return json_({ success: false, message: located.error })

  const tagCol = findHeader_(located.headers, 'tag')
  if (tagCol === -1) return json_({ success: false, message: 'Missing tag column' })

  const row = located.values.slice()
  row[tagCol] = sheetCell_(body.tag)
  sheet.getRange(located.rowNumber, 1, 1, located.headers.length).setValues([row])

  return json_({
    success: true,
    id: String(body.id),
    row: located.rowNumber,
    tag: row[tagCol],
    game: rowToObject_(located.headers, row),
  })
}

function createGame_(sheet, body) {
  const headers = getHeaders_(sheet)
  if (!headers.some(Boolean)) return json_({ success: false, message: 'Sheet has no header row' })

  const game = body.game && typeof body.game === 'object' ? body.game : {}
  const row = headers.map(function () { return '' })
  headers.forEach(function (header, index) {
    if (!header || !Object.prototype.hasOwnProperty.call(game, header)) return
    row[index] = sheetCell_(game[header])
  })

  const idCol = findHeader_(headers, 'id')
  if (idCol !== -1 && String(row[idCol]).trim() === '') {
    row[idCol] = nextId_(sheet, idCol)
  }

  const nextRow = Math.max(sheet.getLastRow(), 1) + 1
  sheet.getRange(nextRow, 1, 1, headers.length).setValues([row])
  return json_({
    success: true,
    id: idCol === -1 ? '' : String(row[idCol]),
    game: rowToObject_(headers, row),
  })
}

function updateGame_(sheet, body) {
  const located = findRow_(sheet, requestId_(body))
  if (located.error) return json_({ success: false, message: located.error })

  const patch = body.game && typeof body.game === 'object' ? body.game : {}
  const row = located.values.slice()
  located.headers.forEach(function (header, index) {
    if (!header || String(header).toLowerCase() === 'id') return
    if (!Object.prototype.hasOwnProperty.call(patch, header)) return
    row[index] = sheetCell_(patch[header])
  })

  sheet.getRange(located.rowNumber, 1, 1, located.headers.length).setValues([row])
  return json_({
    success: true,
    id: String(requestId_(body)),
    game: rowToObject_(located.headers, row),
  })
}

function deleteGame_(sheet, body) {
  const located = findRow_(sheet, requestId_(body))
  if (located.error) return json_({ success: false, message: located.error })
  sheet.deleteRow(located.rowNumber)
  return json_({ success: true, id: String(requestId_(body)) })
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(sheetID)
  const sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet) throw new Error('Sheet not found: ' + sheetName)
  return sheet
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn()
  if (lastColumn < 1) return []
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(headerName_)
}

function findRow_(sheet, id) {
  if (id === undefined || id === null || String(id).trim() === '') {
    return { error: 'Game not found' }
  }
  const data = sheet.getDataRange().getValues()
  if (data.length === 0) return { error: 'Sheet is empty' }

  const headers = data[0].map(headerName_)
  const idCol = findHeader_(headers, 'id')
  if (idCol === -1) return { error: 'Missing id column' }

  const target = String(id)
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === target) {
      return { headers: headers, rowNumber: i + 1, values: data[i] }
    }
  }
  return { error: 'Game not found' }
}

function requestId_(body) {
  if (body.gameId !== undefined && body.gameId !== null && String(body.gameId).trim() !== '') {
    return body.gameId
  }
  if (body.id !== undefined && body.id !== null && String(body.id).trim() !== '') return body.id
  if (body.game && body.game.id !== undefined) return body.game.id
  return ''
}

function nextId_(sheet, idCol) {
  const data = sheet.getDataRange().getValues()
  var max = 0
  for (var i = 1; i < data.length; i++) {
    const raw = data[i][idCol]
    if (raw === '' || raw === null || raw === undefined) continue
    const text = String(raw).trim()
    if (!/^\d+$/.test(text)) return Utilities.getUuid()
    max = Math.max(max, Number(text))
  }
  return max + 1
}

function findHeader_(headers, name) {
  const exact = headers.indexOf(name)
  if (exact !== -1) return exact
  const target = name.toLowerCase()
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === target) return i
  }
  return -1
}

function headerName_(value) {
  return value === null || value === undefined ? '' : String(value)
}

function rowHasValue_(row) {
  return row.some(function (cell) {
    return String(cell === null || cell === undefined ? '' : cell).trim() !== ''
  })
}

function sheetCell_(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return isFinite(value) ? value : ''
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return ''
  if (value.charAt(0) === '=') return "'" + value
  return value
}

function cellValue_(value) {
  if (value instanceof Date) return value.toISOString()
  if (value === null || value === undefined) return ''
  return value
}

function rowToObject_(headers, row) {
  const obj = {}
  headers.forEach(function (header, index) {
    if (!header) return
    obj[header] = cellValue_(row[index])
  })
  return obj
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}
