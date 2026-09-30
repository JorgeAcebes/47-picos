const fs = require('fs');
let content = fs.readFileSync('components/summit-tracker.tsx', 'utf-8');
content = content.replace(/itemType: 'experience',/g, "itemType: 'experience' as const,");

// Also let's fix the type narrowing issue. If TS thinks selected.itemType can't be 'experience', it's because earlier in the code it was narrowed.
// Wait, if I do const isSelectedExp = selected?.itemType === 'experience'; at the top of the component, maybe it avoids narrowing issues inside the JSX?
// No, the narrowing happens because in JSX it's doing type narrowing. I'll just change the check to (selected as any)?.itemType === 'experience'.
content = content.replace(/selected\?\.itemType === 'experience'/g, "(selected as any)?.itemType === 'experience'");

fs.writeFileSync('components/summit-tracker.tsx', content);
