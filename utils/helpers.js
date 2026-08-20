// Helper function to calculate date differences
function getDaysDiff(dateStr1, dateStr2 = '2026-07-22') {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Generate simple CSV output
function formatCSV(data, headers) {
  const headerLine = headers.join(',');
  const rowLines = data.map(row => 
    headers.map(header => {
      let val = row[header] !== undefined ? row[header] : '';
      // Escape strings containing commas
      if (typeof val === 'string' && val.includes(',')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',')
  );
  return [headerLine, ...rowLines].join('\n');
}

// Token-based link builders
function encryptToken(payload) {
  const str = JSON.stringify(payload);
  return Buffer.from(str).toString('base64');
}

function decryptToken(token) {
  try {
    const str = Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(str);
  } catch (error) {
    return null;
  }
}

module.exports = {
  getDaysDiff,
  formatCSV,
  encryptToken,
  decryptToken
};
