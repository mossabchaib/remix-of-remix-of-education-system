// Generic, storage-agnostic CSV export helper. Pure UI/browser action —
// no persistence involved, so it deliberately lives outside the
// Services layer (nothing here writes to lms-storage).
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}