import ExcelJS from 'exceljs'

/** Server-only: converts the first worksheet of an .xlsx file into a string table matching parseCsv's shape. */
export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const table: string[][] = []
  sheet.eachRow(row => {
    const cells: string[] = []
    row.eachCell({ includeEmpty: true }, cell => {
      cells.push(cellToString(cell.value))
    })
    if (cells.some(c => c.trim() !== '')) table.push(cells)
  })

  return table
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text
    if ('result' in value) return cellToString(value.result as ExcelJS.CellValue)
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map(t => t.text).join('')
    }
    return ''
  }
  return String(value)
}
