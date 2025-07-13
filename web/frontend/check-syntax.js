const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'index.js');
const content = fs.readFileSync(filePath, 'utf8');

try {
  // Try to parse the file content as a module
  const Module = require('module');
  const m = new Module();
  m._compile(content, filePath);
  console.log('No syntax errors found.');
} catch (error) {
  console.error('Syntax error found:');
  console.error(error.message);
  
  // Try to extract line and column information
  const match = error.message.match(/^[^\n]*\(?(\d+):(\d+)\)?/);
  if (match) {
    const line = parseInt(match[1], 10);
    const column = parseInt(match[2], 10);
    console.error(`Error at line ${line}, column ${column}`);
    
    // Show the problematic line with context
    const lines = content.split('\n');
    const start = Math.max(0, line - 3);
    const end = Math.min(lines.length, line + 2);
    
    console.error('\nContext:');
    for (let i = start; i < end; i++) {
      const prefix = i + 1 === line ? '>> ' : '   ';
      console.error(prefix + (i + 1).toString().padStart(4) + ' | ' + lines[i]);
    }
  }
}
