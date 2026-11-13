import * as XLSX from 'xlsx';

export function downloadExcelTemplate(
  filename: string,
  sheetName: string,
  headers: string[],
  sampleRows: (string | number)[][]
) {
  const data = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Set reasonable column widths
  ws['!cols'] = headers.map((h, idx) => {
    const maxLen = Math.max(
      h.length,
      ...sampleRows.map((row) => String(row[idx] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 4, 14), 38) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function exportArrayToExcel(
  filename: string,
  sheetName: string,
  rows: (string | number)[][]
) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (rows.length > 0) {
    const colCount = Math.max(...rows.map((r) => r.length));
    ws['!cols'] = Array.from({ length: colCount }, (_, colIdx) => {
      const maxLen = Math.max(
        10,
        ...rows.slice(0, 50).map((r) => String(r[colIdx] ?? '').length)
      );
      return { wch: Math.min(maxLen + 3, 36) };
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function exportMultiSheetExcel(
  filename: string,
  sheets: { sheetName: string; rows: (string | number)[][] }[]
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ sheetName, rows }, idx) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (rows.length > 0) {
      const colCount = Math.max(...rows.map((r) => r.length));
      ws['!cols'] = Array.from({ length: colCount }, (_, colIdx) => {
        const maxLen = Math.max(
          8,
          ...rows.slice(0, 80).map((r) => String(r[colIdx] ?? '').length)
        );
        return { wch: Math.min(maxLen + 3, 36) };
      });
    }
    const safeName =
      sheetName
        .replace(/[\\/?*[\]:]/g, ' ')
        .trim()
        .slice(0, 31) || `Sheet_${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  XLSX.writeFile(wb, filename);
}

export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const worksheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });
  return json;
}
