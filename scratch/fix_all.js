const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/generate-itinerary/route.ts',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/login/page.tsx',
  'src/backend/services/ai.service.ts',
  'src/backend/utils/affiliates.ts',
  'src/frontend/components/collab/CollabChat.tsx',
  'src/frontend/components/itinerary/DayDiscoveryWidget.tsx'
];

const replacements = [
  [/â‚¹/g, '₹'],
  [/âœ“/g, '✓'],
  [/Â°/g, '°'],
  [/â€”/g, '—'],
  [/â˜…/g, '★'],
  [/â€¢/g, '•'],
  [/ðŸ”¥/g, '🔥'],
  [/ðŸ ¨/g, '🏨'],
  [/ðŸŽŸï¸/g, '🎟️'],
  [/â˜•/g, '☕'],
  [/Â©/g, '©'],
  [/Ã—/g, '×'],
  [/â€“/g, '–'],
  [/â†’/g, '→'],
  [/ðŸŒ´/g, '🌴'],
  [/â–²/g, '▲'],
  [/â–¼/g, '▼'],
  [/â”Œ/g, '┌'],
  [/â”€/g, '─'],
  [/â”¬/g, '┬'],
  [/â”‚/g, '│'],
  [/â”œ/g, '├'],
  [/â”¼/g, '┼'],
  [/â”¤/g, '┤'],
  [/â””/g, '└'],
  [/â”´/g, '┴'],
  [/â”˜/g, '┘'],
  [/â˜€ï¸/g, '☀️'],
  [/âš ï¸/g, '⚠️'],
  [/Â·/g, '·'],
  [/âš¡/g, '⚡']
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`FIXED: ${file}`);
  } else {
    console.log(`NO CHANGE: ${file}`);
  }
});
