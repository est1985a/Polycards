// CSV files for teachers (Phase 4): built in the browser from data the teacher's pages already
// loaded. UTF-8 with a BOM, so Excel on Japanese Windows shows kanji correctly, and CRLF line ends.
// csvCell / toCsv / csvFileName are pure; downloadCsv saves the file.

export const BOM = '\uFEFF';

// A text cell that starts like a formula (= + - @, or a tab / CR) gets a leading ' so Excel
// shows it as text instead of running it (e.g. a nickname "=HYPERLINK(…)"). Numbers are left alone.
const FORMULA_START = /^[=+\-@\t\r]/;

// One cell: null / undefined → empty; quoted when it holds a comma, quote or line break
// (quotes inside are doubled).
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// The whole file: BOM, the header row, then one row per entry, each line ending in CRLF.
export function toCsv(header, rows) {
  return BOM + [header, ...(rows || [])].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// Characters not allowed in file names on Windows / macOS / iPad Files.
// eslint-disable-next-line no-control-regex -- control characters are exactly what must go
const BAD_NAME_CHARS = /[/\\:*?"<>|\u0000-\u001f]/g;

// "1年A組_一覧_2026-10-30.csv"; extra (e.g. a pack name) goes before the date.
export function csvFileName(className, kind, dateKey, extra = null) {
  const parts = [className, kind, extra, dateKey]
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
    .map((p) => String(p).trim().replace(BAD_NAME_CHARS, '_').replace(/\s+/g, ' '));
  return `${parts.join('_')}.csv`;
}

// Saves the file: a download on desktop browsers; on iPad Safari (iPadOS 13+) the download prompt,
// which saves to Files. The temporary link is removed and its address freed afterwards.
export function downloadCsv(fileName, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30 * 1000);
}
