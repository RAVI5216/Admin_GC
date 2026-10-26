/**
 * Export Utilities: CSV file generation and high-resolution PDF print document generation
 */

export type Timeframe = 'week' | 'month' | 'year' | 'all';

/**
 * Filter an array of items by date given a timeframe
 */
export function filterItemsByDate<T>(
  items: T[],
  getDate: (item: T) => string | Date | undefined | null,
  timeframe: Timeframe
): T[] {
  if (timeframe === 'all') return items;

  const now = new Date().getTime();
  const durations: Record<Timeframe, number> = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    all: Infinity,
  };

  const cutoff = now - durations[timeframe];

  return items.filter((item) => {
    const rawDate = getDate(item);
    if (!rawDate) return false;
    const itemTime = new Date(rawDate).getTime();
    return !isNaN(itemTime) && itemTime >= cutoff;
  });
}

/**
 * Export data as a downloadable CSV file with Excel-compatible UTF-8 BOM
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): void {
  const sanitizeCell = (cell: unknown): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(sanitizeCell).join(','),
    ...rows.map((row) => row.map(sanitizeCell).join(',')),
  ].join('\r\n');

  // \uFEFF is UTF-8 Byte Order Mark for Microsoft Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  timeframeLabel: string;
  summaryCards?: Array<{ label: string; value: string | number; accent?: string }>;
  headers: string[];
  rows: (string | number)[][];
  footerNote?: string;
}

/**
 * Generates an executive, printable PDF document and opens the browser's native print/save dialog
 */
export function exportToPdf(options: PdfReportOptions): void {
  const { title, subtitle, timeframeLabel, summaryCards = [], headers, rows, footerNote } = options;
  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const cardsHtml = summaryCards.length
    ? `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px;">
        ${summaryCards
          .map(
            (c) => `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600;">${c.label}</div>
              <div style="font-size: 20px; font-weight: 700; color: ${c.accent || '#0f172a'}; margin-top: 4px;">${c.value}</div>
            </div>
          `
          )
          .join('')}
      </div>
    `
    : '';

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
      <thead>
        <tr style="background-color: #0f172a; color: #ffffff;">
          ${headers
            .map(
              (h) => `
            <th style="padding: 8px 10px; font-weight: 600; border: 1px solid #0f172a;">${h}</th>
          `
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            ${row
              .map(
                (cell) => `
              <td style="padding: 7px 10px; border: 1px solid #e2e8f0; color: #334155;">${cell ?? '—'}</td>
            `
              )
              .join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title} - GarbageGuardian Report</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 15mm 12mm 15mm 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 10px;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          .brand-title {
            font-size: 18px;
            font-weight: 800;
            color: #0284c7;
            letter-spacing: -0.5px;
          }
          .report-title {
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
          }
          .badge {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div>
            <div class="brand-title">♻️ GarbageGuardian Smart Campus System</div>
            <div class="report-title">${title}</div>
            ${subtitle ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${subtitle}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <span class="badge">Period: ${timeframeLabel}</span>
            <div style="font-size: 10px; color: #64748b; margin-top: 5px;">Generated: ${generatedAt}</div>
          </div>
        </div>

        ${cardsHtml}

        <div style="overflow-x: auto;">
          ${tableHtml}
        </div>

        <div class="footer">
          <div>${footerNote || 'Confidential operational report • Marwadi University Smart Campus Operations'}</div>
          <div>Page 1 • Official System Export</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    alert('Pop-up was blocked. Please allow pop-ups for this site to export PDF reports.');
  }
}
