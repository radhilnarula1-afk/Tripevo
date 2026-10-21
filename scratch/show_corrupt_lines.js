const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/generate-itinerary/route.ts',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/backend/services/ai.service.ts',
  'src/backend/utils/affiliates.ts',
  'src/frontend/components/collab/CollabChat.tsx',
  'src/frontend/components/itinerary/DayDiscoveryWidget.tsx'
];

const patterns = [
  { name: 'rupee', regex: /â‚¹/ },
  { name: 'checkmark', regex: /âœ“/ },
  { name: 'degree', regex: /Â°/ },
  { name: 'emdash', regex: /â€”/ },
  { name: 'star', regex: /â˜…/ },
  { name: 'bullet', regex: /â€¢/ },
  { name: 'hotel_emoji', regex: /ðŸ ¨/ },
  { name: 'ticket_emoji', regex: /ðŸŽŸï¸ / },
  { name: 'coffee_emoji', regex: /â˜•/ },
  { name: 'rising_emoji', regex: /ðŸ”¥/ }
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  console.log(`=== FILE: ${file} ===`);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    let matched = [];
    patterns.forEach(p => {
      if (p.regex.test(line)) {
        matched.push(p.name);
      }
    });
    // check for raw non-ascii / weird characters
    if (matched.length > 0 || /[^\x00-\x7F]/.test(line)) {
      console.log(`${idx + 1}: [${matched.join(', ')}] ${line.trim()}`);
    }
  });
});
