const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

function arrayToCSV(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [];
  
  csvLines.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  for (const row of rows) {
    const line = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
    csvLines.push(line);
  }

  return csvLines.join('\r\n');
}

function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  
  function parseLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return values;
  }

  const headers = parseLine(lines[0]);
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, index) => {
      row[h] = vals[index] !== undefined ? vals[index] : '';
    });
    result.push(row);
  }
  return result;
}

/**
 * Generate Excel report buffer with metadata & detailed tables
 */
function generateExcelReport({ title = 'Performance Report', subtitle = '', dateRange = 'All Time', filters = {}, kpis = {}, tables = [] }) {
  const wb = xlsx.utils.book_new();

  // Sheet 1: Summary & KPIs
  const summaryRows = [
    { Parameter: 'Report Title', Value: title },
    { Parameter: 'Scope / Subtitle', Value: subtitle || 'All Active Scope' },
    { Parameter: 'Date Range', Value: dateRange },
    { Parameter: 'Generated At', Value: new Date().toLocaleString() }
  ];

  if (filters && Object.keys(filters).length) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) summaryRows.push({ Parameter: `Filter: ${k}`, Value: String(v) });
    });
  }

  summaryRows.push({ Parameter: '------------------------', Value: '------------------------' });
  summaryRows.push({ Parameter: 'KPI METRICS', Value: 'VALUE' });

  if (kpis && Object.keys(kpis).length) {
    Object.entries(kpis).forEach(([k, v]) => {
      const formattedKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      summaryRows.push({ Parameter: formattedKey, Value: typeof v === 'number' ? (k.includes('Rate') ? `${v}%` : v) : v });
    });
  }

  const wsSummary = xlsx.utils.json_to_sheet(summaryRows);
  xlsx.utils.book_append_sheet(wb, wsSummary, 'KPI Summary');

  // Additional sheets for tables (e.g. Sales Heads, Associates, Projects)
  tables.forEach((t, idx) => {
    const sheetName = (t.name || `Data_${idx + 1}`).substring(0, 31);
    if (t.rows && t.rows.length) {
      const wsData = xlsx.utils.json_to_sheet(t.rows);
      xlsx.utils.book_append_sheet(wb, wsData, sheetName);
    }
  });

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate CSV report with metadata comments and primary table rows
 */
function generateCSVReport({ title = 'Performance Report', dateRange = 'All Time', filters = {}, kpis = {}, rows = [] }) {
  const metaLines = [];
  metaLines.push(`# ========================================================`);
  metaLines.push(`# ${title}`);
  metaLines.push(`# Date Range: ${dateRange}`);
  metaLines.push(`# Generated At: ${new Date().toISOString()}`);

  if (filters && Object.keys(filters).length) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) metaLines.push(`# Filter [${k}]: ${v}`);
    });
  }

  if (kpis && Object.keys(kpis).length) {
    metaLines.push(`# --- KPI Summary ---`);
    Object.entries(kpis).forEach(([k, v]) => {
      metaLines.push(`# ${k}: ${v}`);
    });
  }
  metaLines.push(`# ========================================================`);

  const csvBody = arrayToCSV(rows);
  return `${metaLines.join('\r\n')}\r\n${csvBody}`;
}

/**
 * Generate PDF report buffer using pdfkit
 */
function generatePDFReport({ title = 'Performance Report', subtitle = '', dateRange = 'All Time', filters = {}, kpis = {}, tables = [] }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        info: {
          Title: title,
          Author: 'Invitation Meeting Portal',
          Subject: 'Reports & Analytics'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Header Banner
      doc.rect(36, 36, doc.page.width - 72, 54).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('INVITATION MEETING PORTAL', 48, 46);
      doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('Reports & Analytics Module • Official Performance Export', 48, 66);

      // Title & Metadata
      let y = 105;
      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(title, 36, y);
      y += 18;
      if (subtitle) {
        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text(subtitle, 36, y);
        y += 15;
      }
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`Date Range: ${dateRange}   |   Generated: ${new Date().toLocaleString()}`, 36, y);
      y += 20;

      // Filter tags if present
      const filterEntries = Object.entries(filters || {}).filter(([_, v]) => Boolean(v));
      if (filterEntries.length > 0) {
        doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('Applied Filters:', 36, y);
        const filterStr = filterEntries.map(([k, v]) => `${k}: ${v}`).join('  •  ');
        doc.font('Helvetica').fillColor('#64748b').text(filterStr, 110, y, { width: doc.page.width - 150 });
        y += 18;
      }

      // KPI Grid Box
      if (kpis && Object.keys(kpis).length) {
        doc.rect(36, y, doc.page.width - 72, 60).fill('#f8fafc').stroke('#e2e8f0');
        const kpiList = Object.entries(kpis).slice(0, 6); // First 6 prominent KPIs
        const colWidth = (doc.page.width - 72) / Math.min(kpiList.length, 6);

        kpiList.forEach(([key, val], idx) => {
          const colX = 36 + (idx * colWidth);
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const displayVal = typeof val === 'number' ? (key.includes('Rate') ? `${val}%` : val) : String(val);

          doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text(label.toUpperCase(), colX + 4, y + 10, { width: colWidth - 8, align: 'center' });
          doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(displayVal, colX + 4, y + 26, { width: colWidth - 8, align: 'center' });
        });
        y += 75;
      }

      // Render Tables
      tables.forEach(table => {
        if (!table.rows || !table.rows.length) return;

        // Check page overflow
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = 36;
        }

        doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text(table.name || 'Data Table', 36, y);
        y += 16;

        const headers = Object.keys(table.rows[0]);
        const numCols = headers.length;
        const availableWidth = doc.page.width - 72;
        const colWidth = availableWidth / numCols;

        // Table Header
        doc.rect(36, y, availableWidth, 18).fill('#f1f5f9');
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold');
        headers.forEach((h, i) => {
          doc.text(String(h).toUpperCase(), 36 + (i * colWidth) + 3, y + 5, { width: colWidth - 6, align: i === 0 ? 'left' : 'center', ellipsis: true });
        });
        y += 20;

        // Table Rows (limit to 30 per PDF to prevent huge files)
        const rowSlice = table.rows.slice(0, 30);
        rowSlice.forEach((row, rIdx) => {
          if (y > doc.page.height - 50) {
            doc.addPage();
            y = 36;
          }

          if (rIdx % 2 === 1) {
            doc.rect(36, y - 2, availableWidth, 16).fill('#f8fafc');
          }

          doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
          headers.forEach((h, cIdx) => {
            let val = row[h];
            if (val === null || val === undefined) val = '-';
            doc.text(String(val), 36 + (cIdx * colWidth) + 3, y + 2, { width: colWidth - 6, align: cIdx === 0 ? 'left' : 'center', ellipsis: true });
          });

          y += 16;
        });

        if (table.rows.length > 30) {
          doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Oblique').text(`* Showing top 30 of ${table.rows.length} records. For the full dataset, please use Excel (.xlsx) export.`, 36, y + 4);
          y += 18;
        }

        y += 15;
      });

      // Footer
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#94a3b8').text(
          `Page ${i + 1} of ${totalPages}   •   Confidential - For Internal Use Only`,
          36,
          doc.page.height - 25,
          { align: 'center', width: doc.page.width - 72 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  arrayToCSV,
  parseCSV,
  generateExcelReport,
  generateCSVReport,
  generatePDFReport
};
