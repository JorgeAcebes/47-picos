const fs = require('fs');

const path = 'components/summit-tracker.tsx';
let content = fs.readFileSync(path, 'utf8');

// Insert import
if (!content.includes('import { PeakSidebar }')) {
  content = content.replace(
    'import { MapViewer } from "./map/MapViewer";',
    'import { MapViewer } from "./map/MapViewer";\nimport { PeakSidebar } from "./map/PeakSidebar";'
  );
}

// Replace the aside info-panel block
const startStr = '<aside\\s+className="info-panel"';
const endStr = '</aside>';

const startRegex = new RegExp(startStr);
const matchStart = content.match(startRegex);

if (matchStart) {
  const startIndex = matchStart.index;
  let bracketCount = 1;
  let i = startIndex + startStr.length;
  
  // Actually since there are nested tags, it's safer to just find the exact </aside> that matches.
  // In this file, is there any other </aside> inside the info-panel? No, aside doesn't nest.
  const endIndex = content.indexOf('</aside>', startIndex);
  
  if (endIndex !== -1) {
    const fullEndIndex = endIndex + '</aside>'.length;
    
    const replacement = `<PeakSidebar
      selected={selected}
      closePanel={closePanel}
      isPeaks={isPeaks}
      dynamicCategories={dynamicCategories}
      experienceRecords={experienceRecords}
      selectedPhotos={selectedPhotos}
      setSelectingLocationForExp={setSelectingLocationForExp}
      expToggleSort={expToggleSort}
      renderExpRecord={renderExpRecord}
      isReadOnly={isReadOnly}
      ascentsSortOrder={ascentsSortOrder}
      setAscentsSortOrder={setAscentsSortOrder}
      selectedAscents={selectedAscents}
      formatDate={formatDate}
      handleAddPhotosToDate={handleAddPhotosToDate}
      togglePhotoSelection={togglePhotoSelection}
      selectedPhotosForEdit={selectedPhotosForEdit}
      handlePhotoClick={handlePhotoClick}
      hasWishlist={hasWishlist}
      openRecord={openRecord}
      saveWishlist={saveWishlist}
      selectedExperienceRecords={selectedExperienceRecords}
    />`;

    content = content.substring(0, startIndex) + replacement + content.substring(fullEndIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced info-panel");
  } else {
    console.log("Could not find </aside>");
  }
} else {
  console.log("Could not find <aside className='info-panel'");
}
