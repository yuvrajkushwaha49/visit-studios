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
  
  // Basic CSV parser supporting quotes
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

module.exports = {
  arrayToCSV,
  parseCSV
};
