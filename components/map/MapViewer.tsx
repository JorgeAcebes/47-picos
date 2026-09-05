import React from "react";
import dynamic from "next/dynamic";

const SpainMap = dynamic(() => import("@/components/spain-map").then((mod) => mod.SpainMap), { ssr: false });
const WorldMap = dynamic(() => import("@/components/world-map").then((mod) => mod.WorldMap), { ssr: false });

interface MapViewerProps {
  isPeaks: boolean;
  completedPeakCodes: Set<string>;
  wishlistPeakCodes: Set<string>;
  diffMode: boolean;
  diffPeakOnlyViewer: Set<string>;
  diffPeakOnlyTarget: Set<string>;
  diffPeakBoth: Set<string>;
  selectedId?: string;
  completedCountryIds: Set<string>;
  wishlistCountryIds: Set<string>;
  diffItemOnlyViewer: Set<string>;
  diffItemOnlyTarget: Set<string>;
  diffItemBoth: Set<string>;
  regionsMode: boolean;
  completedRegionIds: Set<string>;
  experiencesMode: boolean;
  experienceRecords: any[];
  selectingLocationForExp: boolean;
  isReadOnly: boolean;
  enableExperiences: boolean;
  openPeakInformation: (item: any) => void;
  openPeakRecord: (item: any) => void;
  openCountryInformation: (item: any) => void;
  handleRegionInformation: (regionId: string, regionName: string, isoA2: string) => void;
  openCountryRecord: (item: any) => void;
  handleMapClickForExp: (lat: number, lng: number) => void;
  handleCancelSelectingLocationForExp: () => void;
  handleExperienceClick: (item: any) => void;
  setExpSelectorOpen: (open: boolean) => void;
}

export function MapViewer({
  isPeaks,
  completedPeakCodes,
  wishlistPeakCodes,
  diffMode,
  diffPeakOnlyViewer,
  diffPeakOnlyTarget,
  diffPeakBoth,
  selectedId,
  completedCountryIds,
  wishlistCountryIds,
  diffItemOnlyViewer,
  diffItemOnlyTarget,
  diffItemBoth,
  regionsMode,
  completedRegionIds,
  experiencesMode,
  experienceRecords,
  selectingLocationForExp,
  isReadOnly,
  enableExperiences,
  openPeakInformation,
  openPeakRecord,
  openCountryInformation,
  handleRegionInformation,
  openCountryRecord,
  handleMapClickForExp,
  handleCancelSelectingLocationForExp,
  handleExperienceClick,
  setExpSelectorOpen,
}: MapViewerProps) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", zIndex: 1 }}>
      {isPeaks ? (
        <SpainMap
          completed={completedPeakCodes}
          wishlist={wishlistPeakCodes}
          onInformation={openPeakInformation}
          onComplete={openPeakRecord}
          diffMode={diffMode}
          diffOnlyViewer={diffPeakOnlyViewer}
          diffOnlyTarget={diffPeakOnlyTarget}
          diffBoth={diffPeakBoth}
          activeId={selectedId}
        />
      ) : (
        <>
          <WorldMap
            completed={completedCountryIds}
            wishlist={wishlistCountryIds}
            onInformation={openCountryInformation}
            onRegionInformation={handleRegionInformation}
            onComplete={openCountryRecord}
            diffMode={diffMode}
            diffOnlyViewer={diffItemOnlyViewer}
            diffOnlyTarget={diffItemOnlyTarget}
            diffBoth={diffItemBoth}
            regionsMode={regionsMode}
            completedRegions={completedRegionIds}
            activeId={selectedId}
            experiencesMode={experiencesMode}
            experienceRecords={experienceRecords}
            selectingLocation={selectingLocationForExp}
            onMapClick={handleMapClickForExp}
            onCancelSelectingLocation={handleCancelSelectingLocationForExp}
            onExperienceClick={handleExperienceClick}
            onAddExperience={() => setExpSelectorOpen(true)}
          />
        </>
      )}
    </div>
  );
}
