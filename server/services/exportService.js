const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
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

const INVITATION_STATUSES = [
  ['draft', 'Draft'],
  ['sent', 'Sent'],
  ['opened', 'Opened'],
  ['confirmed', 'Confirmed'],
  ['reschedule_requested', 'Reschedule Requested'],
  ['cancelled', 'Cancelled'],
  ['expired', 'Expired']
];

function invitationStatusLabel(status) {
  const match = INVITATION_STATUSES.find(([key]) => key === status);
  return match ? match[1] : (status || '');
}

function invitationRoleLabel(role) {
  if (role === 'sales_head') return 'Team Leader';
  if (role === 'sales_associate') return 'Member';
  if (role === 'admin') return 'Admin';
  return role || '';
}

function countInvitationStatuses(rows) {
  const counts = { total: rows.length };
  INVITATION_STATUSES.forEach(([key]) => { counts[key] = 0; });
  rows.forEach(row => {
    if (counts[row.status] !== undefined) counts[row.status] += 1;
  });
  return counts;
}

function invitationCountFields(counts) {
  const fields = { 'Invitations Sent': counts.total };
  INVITATION_STATUSES.forEach(([key, label]) => { fields[label] = counts[key]; });
  return fields;
}

function excelSheetName(name, used) {
  let base = String(name || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sheet';
  base = base.slice(0, 31);
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${n}`;
    candidate = (base.slice(0, 31 - suffix.length) + suffix).trim();
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

const SHEET_HEADER_COLORS = ['FFE599', '9FC5E8', 'B6D7A8', 'D9EAD3', 'F4CCCC', 'F9CB9C', 'FCE5CD', 'D5A6BD', 'FFF2CC', 'C9DAF8', 'D0E0E3'];
const SHEET_ROW_COLORS = ['FFF9E6', 'DEEAF6', 'E7F5E3', 'F2FBF2', 'FDE9E9', 'FEF3E6', 'FFF6EA', 'F8EEF4', 'FFF9E6', 'EAF1FB', 'EEF5F6'];

function invitationBorder() {
  const edge = { style: 'thin', color: { argb: 'FFD0D0D0' } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function paintCell(cell, fill, { bold = false, align = 'left', color = 'FF1F1B3B', size = 11 } = {}) {
  const argb = String(fill).length === 6 ? `FF${fill}` : fill;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  cell.font = { name: 'Calibri', size, bold, color: { argb: color } };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: false };
  cell.border = invitationBorder();
}

function paintDataRow(row, columnCount, { header = false } = {}) {
  const fills = header ? SHEET_HEADER_COLORS : SHEET_ROW_COLORS;
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col);
    paintCell(cell, fills[(col - 1) % fills.length], {
      bold: header,
      align: col === 1 ? 'left' : 'center'
    });
  }
  row.height = header ? 22 : 20;
}

function addColoredTable(workbook, used, name, records, widths, tabColor) {
  const sheet = workbook.addWorksheet(excelSheetName(name, used), {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: tabColor || 'FFE599' } }
  });
  const source = records.length ? records : [{ Note: 'No records' }];
  const headers = Object.keys(source[0]);
  sheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: widths[index] || 16
  }));
  paintDataRow(sheet.getRow(1), headers.length, { header: true });
  source.forEach(record => {
    const row = sheet.addRow(headers.map(header => record[header] ?? ''));
    paintDataRow(row, headers.length);
  });
  if (!records.length) paintDataRow(sheet.getRow(2), 1);
  return sheet;
}

function formatVisitTime12(timeStr) {
  const value = String(timeStr || '').trim();
  if (!value) return '';
  const clock = value.match(/(\d{1,2}):(\d{2})/);
  if (!clock) return value;
  let hour = Number(clock[1]);
  const minute = clock[2];
  if (hour > 23 || Number(minute) > 59) return value;
  const stated = value.match(/\b([AaPp][Mm])\b/);
  const ampm = stated && hour <= 12 ? stated[1].toUpperCase() : (hour >= 12 ? 'PM' : 'AM');
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function invitationDetailRow(inv) {
  return {
    Customer: inv.customer_name || '',
    Phone: inv.customer_phone || '',
    Project: inv.project_name || '',
    Developer: inv.developer_name || '',
    'Visit Date': String(inv.visit_date || '').slice(0, 10),
    'Visit Time': formatVisitTime12(inv.visit_time),
    'Sent By': inv.associate_name || '',
    Role: invitationRoleLabel(inv.associate_role),
    Status: invitationStatusLabel(inv.status)
  };
}

/**
 * Invitation workbook:
 * Summary, Member Wise, Team Wise, Only Team Leader, then one sheet per team.
 */
async function generateInvitationExcel(invitations, meta = {}) {
  const unique = new Map();
  (invitations || []).forEach(inv => {
    if (inv && inv.id) unique.set(inv.id, inv);
  });
  const rows = [...unique.values()];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Visit Studio';
  const used = new Set();

  const teams = new Map();
  const members = new Map();
  const leaders = new Map();

  const ensureTeam = (id, name) => {
    const key = id || 'unassigned';
    if (!teams.has(key)) teams.set(key, { name: name || 'Unassigned', rows: [], people: new Set() });
    return teams.get(key);
  };

  (meta.directory || []).forEach(person => {
    if (person.role === 'sales_head') {
      ensureTeam(person.id, person.name);
      if (!leaders.has(person.id)) leaders.set(person.id, { name: person.name, rows: [] });
    } else if (person.role === 'sales_associate') {
      const teamName = person.team_name || 'Unassigned';
      const team = ensureTeam(person.sales_head_id, teamName);
      team.people.add(person.id);
      if (!members.has(person.id)) {
        members.set(person.id, {
          name: person.name,
          team: teamName,
          teamKey: person.sales_head_id || 'unassigned',
          role: 'Member',
          rows: []
        });
      }
    }
  });

  rows.forEach(inv => {
    const teamKey = inv.team_id || 'unassigned';
    const teamName = inv.team_name || 'Unassigned';
    if (!teams.has(teamKey)) {
      teams.set(teamKey, { name: teamName, rows: [], people: new Set() });
    }
    const team = teams.get(teamKey);
    team.rows.push(inv);
    if (inv.associate_name) team.people.add(inv.associate_id || inv.associate_name);

    if (inv.associate_role === 'sales_head') {
      const key = inv.associate_id || inv.associate_name || 'leader';
      if (!leaders.has(key)) leaders.set(key, { name: inv.associate_name || 'Team Leader', rows: [] });
      leaders.get(key).rows.push(inv);
    } else {
      const key = inv.associate_id || inv.associate_name || 'member';
      if (!members.has(key)) {
        members.set(key, {
          name: inv.associate_name || 'Member',
          team: teamName,
          teamKey,
          role: invitationRoleLabel(inv.associate_role),
          rows: []
        });
      }
      members.get(key).rows.push(inv);
    }
  });

  const summaryCounts = countInvitationStatuses(rows);
  const summary = [
    ['Digital Invitations'],
    ['Generated At', new Date().toLocaleString('en-IN')],
    ['Generated By', meta.generatedBy || ''],
    ['Role', meta.role || ''],
    [],
    ['Metric', 'Count'],
    ['Invitations Sent', summaryCounts.total],
    ...INVITATION_STATUSES.map(([key, label]) => [label, summaryCounts[key]]),
    ['Teams', [...teams.keys()].filter(key => key !== 'unassigned').length],
    ['Members', members.size],
    ['Team Leaders', leaders.size]
  ];
  const summarySheet = wb.addWorksheet(excelSheetName('Summary', used), {
    properties: { tabColor: { argb: 'FF1F1B3B' } }
  });
  summarySheet.columns = [{ width: 28 }, { width: 24 }];
  summary.forEach((pair, index) => {
    const row = summarySheet.addRow(pair);
    row.height = index === 0 ? 26 : 20;
    if (index === 0) {
      paintCell(row.getCell(1), 'FF1F1B3B', { bold: true, color: 'FFFFFFFF' });
      paintCell(row.getCell(2), 'FF1F1B3B', { bold: true, color: 'FFFFFFFF' });
    } else if (index < 4) {
      paintCell(row.getCell(1), 'FFF2CC', { bold: true });
      paintCell(row.getCell(2), 'FFDEEAF6');
    } else if (!pair.length) {
      row.height = 10;
    } else if (pair[0] === 'Metric') {
      paintCell(row.getCell(1), 'FFE599', { bold: true, align: 'center' });
      paintCell(row.getCell(2), 'FF9FC5E8', { bold: true, align: 'center' });
    } else {
      const tone = SHEET_ROW_COLORS[(index - 6) % SHEET_ROW_COLORS.length];
      const headerTone = SHEET_HEADER_COLORS[(index - 6) % SHEET_HEADER_COLORS.length];
      paintCell(row.getCell(1), tone, { bold: true });
      paintCell(row.getCell(2), headerTone, { bold: true, align: 'center' });
    }
  });

  const memberRows = [...members.values()]
    .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name))
    .map(member => ({
      Member: member.name,
      Team: member.team === 'Unassigned' ? 'Unassigned' : `${member.team} Team`,
      Role: member.role,
      ...invitationCountFields(countInvitationStatuses(member.rows))
    }));
  addColoredTable(wb, used, 'Member Wise', memberRows, [24, 28, 16, 18, 12, 12, 14, 22, 14, 12, 12], 'FF9FC5E8');

  const teamRows = [...teams.values()]
    .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name))
    .map(team => ({
      Team: team.name === 'Unassigned' ? 'Unassigned' : `${team.name} Team`,
      'Team Leader': team.name === 'Unassigned' ? '-' : team.name,
      Members: Math.max(team.people.size - (team.rows.some(row => row.associate_role === 'sales_head' && row.associate_name === team.name) ? 1 : 0), 0),
      ...invitationCountFields(countInvitationStatuses(team.rows))
    }));
  addColoredTable(wb, used, 'Team Wise', teamRows, [28, 24, 12, 18, 12, 12, 14, 22, 14, 12, 12], 'FFB6D7A8');

  const leaderRows = [...leaders.values()]
    .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name))
    .map(leader => ({
      'Team Leader': leader.name,
      Team: `${leader.name} Team`,
      ...invitationCountFields(countInvitationStatuses(leader.rows))
    }));
  addColoredTable(wb, used, 'Only Team Leader', leaderRows, [24, 28, 18, 12, 12, 14, 22, 14, 12, 12], 'FFF4CCCC');

  const statusFillFor = {
    Sent: 'FFDEEAF6',
    Opened: 'FFE7F5E3',
    Confirmed: 'FFD9EAD3',
    'Reschedule Requested': 'FFFCE5CD',
    Cancelled: 'FFF4CCCC',
    Expired: 'FFEAD1DC',
    Draft: 'FFFFF2CC'
  };
  const reportNow = new Date();
  const reportLabel = `Report For (${String(reportNow.getDate()).padStart(2, '0')}-${String(reportNow.getMonth() + 1).padStart(2, '0')}-${reportNow.getFullYear()}) Today`;
  const countHeaders = ['Member', 'Team', 'Role', 'Invitations Sent', 'Draft', 'Sent', 'Opened', 'Confirmed', 'Reschedule Requested', 'Cancelled', 'Expired'];
  const listHeaders = ['Customer', 'Phone', 'Project', 'Developer', 'Visit Date', 'Visit Time', 'Sent By', 'Role', 'Status'];

  [...teams.entries()]
    .filter(([, team]) => team.name !== 'Unassigned')
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .forEach(([teamKey, team], teamIndex) => {
      const leader = leaders.get(teamKey);
      const teamMembers = [...members.values()].filter(member => member.teamKey === teamKey);
      const countPeople = [
        ...(leader ? [{ name: leader.name, team: team.name, role: 'Team Leader', rows: leader.rows }] : []),
        ...teamMembers
      ].sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name));
      const countRecords = countPeople.map(person => ({
        Member: person.name,
        Team: person.team === 'Unassigned' ? 'Unassigned' : `${person.team} Team`,
        Role: person.role,
        ...invitationCountFields(countInvitationStatuses(person.rows))
      }));
      const detail = team.rows
        .slice()
        .sort((a, b) => String(b.visit_date || '').localeCompare(String(a.visit_date || '')))
        .map(invitationDetailRow);
      const sheet = wb.addWorksheet(excelSheetName(`${team.name} Team`, used), {
        properties: { tabColor: { argb: 'FF' + SHEET_HEADER_COLORS[teamIndex % SHEET_HEADER_COLORS.length] } }
      });
      sheet.columns = [28, 28, 16, 18, 14, 14, 22, 22, 22, 14, 14].map(width => ({ width }));

      const titleSpan = countHeaders.length;
      const title = sheet.addRow([`${team.name} Team`]);
      sheet.mergeCells(1, 1, 1, titleSpan);
      title.height = 34;
      for (let col = 1; col <= titleSpan; col += 1) {
        paintCell(title.getCell(col), 'FF1A5C54', { bold: true, align: 'center', color: 'FFFFFFFF', size: 20 });
      }
      const reportRow = sheet.addRow([reportLabel]);
      sheet.mergeCells(reportRow.number, 1, reportRow.number, titleSpan);
      reportRow.height = 26;
      for (let col = 1; col <= titleSpan; col += 1) {
        paintCell(reportRow.getCell(col), 'FFC9CDF2', { bold: true, align: 'center', size: 14 });
      }

      const countTitle = sheet.addRow(['Member Wise']);
      sheet.mergeCells(countTitle.number, 1, countTitle.number, countHeaders.length);
      countTitle.height = 22;
      for (let col = 1; col <= countHeaders.length; col += 1) {
        paintCell(countTitle.getCell(col), 'FF9FC5E8', { bold: true });
      }
      const countHeaderRow = sheet.addRow(countHeaders);
      paintDataRow(countHeaderRow, countHeaders.length, { header: true });
      const countSource = countRecords.length ? countRecords : [{ Member: 'No records' }];
      countSource.forEach(record => {
        const row = sheet.addRow(countHeaders.map(header => record[header] ?? ''));
        paintDataRow(row, countHeaders.length);
      });

      sheet.addRow([]);

      const listTitle = sheet.addRow(['Invitation List']);
      sheet.mergeCells(listTitle.number, 1, listTitle.number, listHeaders.length);
      listTitle.height = 22;
      for (let col = 1; col <= listHeaders.length; col += 1) {
        paintCell(listTitle.getCell(col), 'FFB6D7A8', { bold: true });
      }
      const listHeaderRow = sheet.addRow(listHeaders);
      paintDataRow(listHeaderRow, listHeaders.length, { header: true });
      const listSource = detail.length ? detail : [{ Customer: 'No records' }];
      listSource.forEach(item => {
        const row = sheet.addRow(listHeaders.map(header => item[header] ?? ''));
        paintDataRow(row, listHeaders.length);
        const statusFill = statusFillFor[item.Status];
        if (statusFill) paintCell(row.getCell(9), statusFill, { align: 'center', bold: true });
      });
    });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function teamStatusLabel(status) {
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  if (status === 'suspended') return 'Suspended';
  return status || '';
}

function teamStatusFill(label) {
  return {
    Active: 'FFD9EAD3',
    Inactive: 'FFF4CCCC',
    Suspended: 'FFFCE5CD'
  }[label];
}

/**
 * Sales team workbook: Summary, Sales Heads, Members, then one sheet per team.
 */
async function generateTeamExcel(heads, associates, meta = {}) {
  const headList = (heads || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const memberList = (associates || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const headById = new Map(headList.map(head => [head.id, head]));
  const teamNameFor = (member) => member.sales_head_name || headById.get(member.sales_head_id)?.name || 'Unassigned';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Visit Studio';
  const used = new Set();
  const reportNow = new Date();
  const reportLabel = `Report For (${String(reportNow.getDate()).padStart(2, '0')}-${String(reportNow.getMonth() + 1).padStart(2, '0')}-${reportNow.getFullYear()}) Today`;

  const countStatus = (rows, status) => rows.filter(row => row.status === status).length;
  const summary = [
    ['Sales Team'],
    [reportLabel],
    ['Generated At', reportNow.toLocaleString('en-IN')],
    ['Generated By', meta.generatedBy || ''],
    ['Role', meta.role || ''],
    [],
    ['Metric', 'Count'],
    ['Sales Heads', headList.length],
    ['Members', memberList.length],
    ['Active', countStatus(headList, 'active') + countStatus(memberList, 'active')],
    ['Inactive', countStatus(headList, 'inactive') + countStatus(memberList, 'inactive')],
    ['Suspended', countStatus(headList, 'suspended') + countStatus(memberList, 'suspended')]
  ];
  const summarySheet = wb.addWorksheet(excelSheetName('Summary', used), {
    properties: { tabColor: { argb: 'FF1A5C54' } }
  });
  summarySheet.columns = [{ width: 28 }, { width: 36 }];
  summary.forEach((pair, index) => {
    const row = summarySheet.addRow(pair);
    row.height = index < 2 ? 30 : 20;
    const span = 2;
    if (index === 0) {
      summarySheet.mergeCells(row.number, 1, row.number, span);
      for (let col = 1; col <= span; col += 1) paintCell(row.getCell(col), 'FF1A5C54', { bold: true, align: 'center', color: 'FFFFFFFF', size: 20 });
    } else if (index === 1) {
      summarySheet.mergeCells(row.number, 1, row.number, span);
      for (let col = 1; col <= span; col += 1) paintCell(row.getCell(col), 'FFC9CDF2', { bold: true, align: 'center', size: 14 });
    } else if (index < 5) {
      paintCell(row.getCell(1), 'FFF2CC', { bold: true });
      paintCell(row.getCell(2), 'FFDEEAF6');
    } else if (!pair.length) {
      row.height = 10;
    } else if (pair[0] === 'Metric') {
      paintCell(row.getCell(1), 'FFE599', { bold: true, align: 'center' });
      paintCell(row.getCell(2), 'FF9FC5E8', { bold: true, align: 'center' });
    } else {
      const tone = SHEET_ROW_COLORS[(index - 7) % SHEET_ROW_COLORS.length];
      const headerTone = SHEET_HEADER_COLORS[(index - 7) % SHEET_HEADER_COLORS.length];
      paintCell(row.getCell(1), tone, { bold: true });
      paintCell(row.getCell(2), headerTone, { bold: true, align: 'center' });
    }
  });

  const headRecords = headList.map(head => ({
    'Sales Head': head.name || '',
    Email: head.email || '',
    Phone: head.phone || '',
    Members: memberList.filter(member => member.sales_head_id === head.id).length,
    Status: teamStatusLabel(head.status)
  }));
  const headSheet = addColoredTable(wb, used, 'Sales Heads', headRecords, [28, 32, 18, 12, 14], 'FFB6D7A8');
  headRecords.forEach((record, index) => {
    const fill = teamStatusFill(record.Status);
    if (fill) paintCell(headSheet.getRow(index + 2).getCell(5), fill, { align: 'center', bold: true });
  });

  const memberRecords = memberList.map(member => ({
    Member: member.name || '',
    Team: teamNameFor(member) === 'Unassigned' ? 'Unassigned' : `${teamNameFor(member)} Team`,
    Email: member.email || '',
    Phone: member.phone || '',
    Status: teamStatusLabel(member.status)
  }));
  const memberSheet = addColoredTable(wb, used, 'Members', memberRecords, [28, 28, 32, 18, 14], 'FF9FC5E8');
  memberRecords.forEach((record, index) => {
    const fill = teamStatusFill(record.Status);
    if (fill) paintCell(memberSheet.getRow(index + 2).getCell(5), fill, { align: 'center', bold: true });
  });

  const headers = ['Name', 'Role', 'Email', 'Phone', 'Status'];
  headList.forEach((head, teamIndex) => {
    const people = [
      { name: head.name, role: 'Team Leader', email: head.email, phone: head.phone, status: head.status },
      ...memberList
        .filter(member => member.sales_head_id === head.id)
        .map(member => ({ name: member.name, role: 'Member', email: member.email, phone: member.phone, status: member.status }))
    ];
    const sheet = wb.addWorksheet(excelSheetName(`${head.name || 'Team'} Team`, used), {
      properties: { tabColor: { argb: 'FF' + SHEET_HEADER_COLORS[teamIndex % SHEET_HEADER_COLORS.length] } }
    });
    sheet.columns = [28, 16, 32, 18, 14].map(width => ({ width }));
    const title = sheet.addRow([`${head.name || 'Team'} Team`]);
    sheet.mergeCells(1, 1, 1, headers.length);
    title.height = 34;
    for (let col = 1; col <= headers.length; col += 1) {
      paintCell(title.getCell(col), 'FF1A5C54', { bold: true, align: 'center', color: 'FFFFFFFF', size: 20 });
    }
    const reportRow = sheet.addRow([reportLabel]);
    sheet.mergeCells(reportRow.number, 1, reportRow.number, headers.length);
    reportRow.height = 26;
    for (let col = 1; col <= headers.length; col += 1) {
      paintCell(reportRow.getCell(col), 'FFC9CDF2', { bold: true, align: 'center', size: 14 });
    }
    const headerRow = sheet.addRow(headers);
    paintDataRow(headerRow, headers.length, { header: true });
    people.forEach(person => {
      const status = teamStatusLabel(person.status);
      const row = sheet.addRow([person.name || '', person.role, person.email || '', person.phone || '', status]);
      paintDataRow(row, headers.length);
      const fill = teamStatusFill(status);
      if (fill) paintCell(row.getCell(5), fill, { align: 'center', bold: true });
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  arrayToCSV,
  parseCSV,
  generateExcelReport,
  generateCSVReport,
  generatePDFReport,
  generateInvitationExcel,
  generateTeamExcel
};
