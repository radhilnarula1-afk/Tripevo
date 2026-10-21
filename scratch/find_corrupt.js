const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (/\.(tsx|ts|css)$/.test(file)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('./src');
const patterns = [
  /â‚¹/g,
  /âœ“/g,
  /Â°/g,
  /â€”/g,
  /â˜…/g,
  /ðŸ/g,
  /â˜•/g
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let found = false;
  patterns.forEach(p => {
    if (p.test(content)) {
      found = true;
    }
  });
  if (found) {
    console.log('CORRUPT:', file);
  }
});
