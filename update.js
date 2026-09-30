const fs = require('fs');
let content = fs.readFileSync('components/summit-tracker.tsx', 'utf-8');

// Add itemType to SelectedItem
content = content.replace(
  '  subItems?: any;\r\n};',
  '  subItems?: any;\r\n  itemType?: \'peak\' | \'country\' | \'region\' | \'experience\';\r\n};'
);

// Update peakToItem
content = content.replace(
  '    note: peak.note,\r\n  };\r\n}',
  '    note: peak.note,\r\n    itemType: \'peak\',\r\n  };\r\n}'
);

// Update countryToItem
content = content.replace(
  '    note: \\ · \\,\r\n  };\r\n}',
  '    note: \\ · \\,\r\n    itemType: \'country\',\r\n  };\r\n}'
);

// Update regionToItem
content = content.replace(
  '    note: \\ · \\,\r\n  };\r\n}',
  '    note: \\ · \\,\r\n    itemType: \'region\',\r\n  };\r\n}'
);

// Update experiences (4 matches)
content = content.replace(
  /subItems: exp\.subItems,\r\n      \};/g,
  'subItems: exp.subItems,\r\n        itemType: \'experience\',\r\n      };'
);

content = content.replace(
  /subItems: exp\.subItems,\r\n              \}\)\),/g,
  'subItems: exp.subItems,\r\n                itemType: \'experience\',\r\n              })),'
);

// Update isExperience in handleDeleteAscent and handleSave
content = content.replace(
  /const isExperience =\r\n      isExp;/g,
  'const isExperience = selected?.itemType === \'experience\';'
);

// Finally, replace isExp inside className=\"info-panel\" block.
const startIndex = content.indexOf('className=\"info-panel\"');
const endIndex = content.indexOf('</aside>', startIndex);
const prefix = content.substring(0, startIndex);
const suffix = content.substring(endIndex);
let middle = content.substring(startIndex, endIndex);

middle = middle.replace(/\bisExp\b/g, "(selected?.itemType === 'experience')");

content = prefix + middle + suffix;

fs.writeFileSync('components/summit-tracker.tsx', content);
