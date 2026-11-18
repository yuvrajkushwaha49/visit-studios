const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, '.ai', 'FILE_STRUCTURE.md');

// Directories and patterns to ignore
const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.gemini',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.next',
  '.nuxt',
  'tmp',
  'temp',
  'visit_studio.db-shm',
  'visit_studio.db-wal'
]);

function shouldIgnore(name) {
  if (IGNORED_NAMES.has(name)) return true;
  if (name.startsWith('.git')) return true;
  return false;
}

function buildTree(dirPath, prefix = '') {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    return `${prefix}[Error reading directory: ${err.message}]\n`;
  }

  // Sort: directories first, then alphabetical
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  const filtered = entries.filter(e => !shouldIgnore(e.name));
  let result = '';

  filtered.forEach((entry, index) => {
    const isLast = index === filtered.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      result += `${prefix}${connector}${entry.name}/\n`;
      result += buildTree(fullPath, nextPrefix);
    } else {
      result += `${prefix}${connector}${entry.name}\n`;
    }
  });

  return result;
}

function generate() {
  const rootName = path.basename(ROOT_DIR) || 'project';
  const treeContent = buildTree(ROOT_DIR);

  const markdown = `# Project File Structure

Generated automatically by \`scripts/generate-ai-context.cjs\`.
*Last scanned: ${new Date().toISOString()}*

\`\`\`
${rootName}/
${treeContent}\`\`\`

## Key Directory Guide

- \`server/\`: Backend application code (Node.js & Express)
  - \`server/config.js\`: Central configuration and environment loader
  - \`server/index.js\`: Express application initialization, middleware & routes registration
  - \`server/db/\`: Database connections, schema definitions, dual-sync handlers, and seeds
  - \`server/middleware/\`: Authentication (JWT & RBAC) and audit logging middleware
  - \`server/routes/\`: Express REST API endpoints organized by domain
  - \`server/services/\`: Business logic services (QR generator, WhatsApp, CSV/Excel export)
- \`public/\`: Frontend Single Page Application assets
  - \`public/index.html\`: Core HTML frame, dialogs, modals & layout templates
  - \`public/css/style.css\`: Unified responsive stylesheet & theme variables
  - \`public/js/app.js\`: Frontend controller, navigation, modal manager, and event router
  - \`public/js/api.js\`: Centralized HTTP fetch client with token handling
  - \`public/js/utils.js\`: UI utilities, notification system, date formatters, and client-side canvas generators
  - \`public/js/components/\`: Modular view controllers for each functional portal screen
- \`test/\`: Integration test suites
- \`.ai/\`: Architectural and operational documentation for AI assistants
`;

  const targetDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
  console.log(`Successfully generated ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

generate();
