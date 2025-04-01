const fs = require('fs');
const path = require('path');

// Read the adapter file
const adapterPath = path.join(__dirname, 'lib', 'mistral', 'mcp-adapter.ts');
const fixPath = path.join(__dirname, 'lib', 'mistral', 'mcp-adapter.ts.fix');

console.log('Reading adapter file:', adapterPath);
const adapterContent = fs.readFileSync(adapterPath, 'utf8');
const fixContent = fs.readFileSync(fixPath, 'utf8');

// Find the executeToolCalls method
const startMarker = 'private async executeToolCalls(toolCalls: any[]): Promise<Message[]> {';
const endMarker = '}'; // This will be ambiguous, so we'll need to be careful

// Find the start index
const startIndex = adapterContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('Could not find the start of executeToolCalls method');
  process.exit(1);
}

// Find the matching closing brace
let openBraces = 1;
let endIndex = startIndex + startMarker.length;
while (openBraces > 0 && endIndex < adapterContent.length) {
  if (adapterContent[endIndex] === '{') {
    openBraces++;
  } else if (adapterContent[endIndex] === '}') {
    openBraces--;
    if (openBraces === 0) {
      // Found the matching closing brace
      break;
    }
  }
  endIndex++;
}

if (openBraces !== 0) {
  console.error('Could not find the end of executeToolCalls method');
  process.exit(1);
}

// Replace the method
const newMethod = fixContent;
const newContent = adapterContent.substring(0, startIndex) + 
                   startMarker + 
                   "\n" + 
                   newMethod + 
                   adapterContent.substring(endIndex);

// Create a backup
fs.writeFileSync(adapterPath + '.bak', adapterContent);
console.log('Created backup at:', adapterPath + '.bak');

// Write the new content
fs.writeFileSync(adapterPath, newContent);
console.log('Updated adapter file!');
