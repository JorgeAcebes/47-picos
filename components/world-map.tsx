"use client";

import * as L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { Path } from "leaflet";
import type { FeatureCollection, Position } from "geojson";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import * as ReactDOMServer from "react-dom/server";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { countries, resolveCountryFromFeature, type Country } from "@/data/countries";
import { regionsByCountryIsoA2 } from "@/data/regions";
import { MapSearchControl, type SearchItem } from "./map-search";
import { SweepOverlay } from "./sweep-overlay";

// Override Leaflet's default canvas padding to preload vector shapes far outside the viewport
L.Canvas.prototype.options.padding = 1.5;

const WORLD_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const WORLD_REGIONS_TOPO_URL = "/world-regions.topo.json";

// ── Module-level GeoJSON cache ────────────
let _worldGeoCache: FeatureCollection | null = null;
let _worldGeoPromise: Promise<FeatureCollection> | null = null;
let _regionsGeoCache: FeatureCollection | null = null;
let _regionsGeoPromise: Promise<FeatureCollection> | null = null;

function fetchWorldGeo(): Promise<FeatureCollection> {
  if (_worldGeoCache) return Promise.resolve(_worldGeoCache);
  if (!_worldGeoPromise) {
    _worldGeoPromise = fetch(WORLD_TOPO_URL)
      .then((response) => response.json())
      .then((topology: Topology) => {
        const countriesGeo = feature(
          topology,
          topology.objects.countries as any,
        ) as unknown as FeatureCollection;
        fixAntimeridian(countriesGeo);
        _worldGeoCache = countriesGeo;
        return countriesGeo;
      });
  }
  return _worldGeoPromise;
}

function fetchWorldRegionsGeo(): Promise<FeatureCollection> {
  if (_regionsGeoCache) return Promise.resolve(_regionsGeoCache);
  if (!_regionsGeoPromise) {
    _regionsGeoPromise = fetch(WORLD_REGIONS_TOPO_URL)
      .then((response) => response.json())
      .then((topology: Topology) => {
        const regionsGeo = feature(
          topology,
          topology.objects.regions as any,
        ) as unknown as FeatureCollection;
        fixAntimeridian(regionsGeo);
        _regionsGeoCache = regionsGeo;
        return regionsGeo;
      });
  }
  return _regionsGeoPromise;
}

function fixAntimeridian(geo: FeatureCollection) {
  const fixRing = (ring: Position[]) => {
    for (let i = 1; i < ring.length; i++) {
      const prev = ring[i - 1][0];
      let curr = ring[i][0];
      if (curr - prev > 180) {
        ring[i][0] -= 360;
      } else if (curr - prev < -180) {
        ring[i][0] += 360;
      }
    }
  };

  geo.features.forEach((f) => {
    if (f.geometry.type === "Polygon") {
      f.geometry.coordinates.forEach(fixRing);
    } else if (f.geometry.type === "MultiPolygon") {
      f.geometry.coordinates.forEach((poly) => poly.forEach(fixRing));
    }
  });
}

type Props = {
  completed: Set<string>;
  wishlist: Set<string>;
  onInformation: (country: Country) => void;
  onComplete: (country: Country) => void;
  diffMode?: boolean;
  diffOnlyViewer?: Set<string>;
  diffOnlyTarget?: Set<string>;
  diffBoth?: Set<string>;
  regionsMode?: boolean;
  completedRegions?: Set<string>;
  onRegionInformation?: (regionId: string, name: string, isoA2: string) => void;
  activeId?: string;
  experiencesMode?: boolean;
  experienceRecords?: any[];
  selectingLocation?: boolean;
  onMapClick?: (lat: number, lng: number, placeName?: string) => void;
  onExperienceClick?: (record: any) => void;
  onAddExperience?: () => void;
};

function FitWorld() {
  const map = useMap();
  useEffect(() => {
    if (window.location.hash.startsWith("#panel=")) {
      const saved = sessionStorage.getItem("mapState_world");
      if (saved) {
        try {
          const { zoom, center } = JSON.parse(saved);
          map.setView(center, zoom, { animate: false });
          return;
        } catch (e) {}
      }
    }

    const aspectRatio = window.innerWidth / window.innerHeight;
    if (aspectRatio > 1) {
      // Desktop: Shift center north to crop Antarctica but keep South America
      const visibleHeight = 360 / Math.max(aspectRatio, 1);
      // Put the bottom edge around -58 (Cape Horn)
      const centerLat = Math.min(-58 + visibleHeight / 2, 50);
      
      map.fitBounds([
        [centerLat - 0.1, -180],
        [centerLat + 0.1, 180]
      ], { padding: [0, 0] });
    } else {
      // Mobile: standard vertical bounds
      map.fitBounds([
        [-60, -180],
        [80, 180]
      ], { padding: [0, 0] });
    }
  }, [map]);
  return null;
}

function MapClickListener({ onMapClick, selectingLocation }: { onMapClick?: (lat: number, lng: number, placeName?: string) => void, selectingLocation?: boolean }) {
  const map = useMapEvents({
    click(e) {
      if (onMapClick && selectingLocation) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=10`)
          .then(res => res.json())
          .then(data => {
            const placeName = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.state || data.name || undefined;
            onMapClick(e.latlng.lat, e.latlng.lng, placeName);
          })
          .catch(() => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
      }
    }
  });
  
  useEffect(() => {
    const container = map.getContainer();
    if (selectingLocation) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [selectingLocation, map]);
  
  return null;
}
function MapZoomListener() {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      sessionStorage.setItem("mapState_world", JSON.stringify({ zoom, center }));
      const container = map.getContainer();
      container.setAttribute("data-zoom", zoom.toString());
    },
    moveend: () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      sessionStorage.setItem("mapState_world", JSON.stringify({ zoom, center }));
    },
  });
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("data-zoom", map.getZoom().toString());
  }, [map]);
  return null;
}

// ── Pre-filter countries with coordinates (stable list) ──
const countriesWithCoords = countries.filter((c) => c.coordinates);

function getLargestPolygonBounds(feature: any) {
  if (!feature || !feature.geometry) return undefined;
  if (feature.geometry.type === "MultiPolygon") {
    let maxPoints = 0;
    let largestPoly = null;
    for (const polyCoords of feature.geometry.coordinates) {
      if (polyCoords[0] && polyCoords[0].length > maxPoints) {
        maxPoints = polyCoords[0].length;
        largestPoly = {
          type: "Feature",
          properties: feature.properties,
          geometry: {
            type: "Polygon",
            coordinates: polyCoords
          }
        };
      }
    }
    if (largestPoly) {
      return L.geoJSON(largestPoly as any).getBounds();
    }
  }
  return L.geoJSON(feature).getBounds();
}

import { getIconComponent } from "./icons";

export function WorldMap({ completed, wishlist, onInformation, onRegionInformation, onComplete, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth, regionsMode, completedRegions, activeId, experiencesMode, experienceRecords, selectingLocation, onMapClick, onExperienceClick, onAddExperience }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(_worldGeoCache);
  const [regionsGeo, setRegionsGeo] = useState<FeatureCollection | null>(_regionsGeoCache);
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  // Use refs for values accessed inside Leaflet event handlers
  const completedRef = useRef(completed);
  const wishlistRef = useRef(wishlist);
  const diffModeRef = useRef(diffMode);
  const diffOnlyViewerRef = useRef(diffOnlyViewer);
  const diffOnlyTargetRef = useRef(diffOnlyTarget);
  const diffBothRef = useRef(diffBoth);
  const regionsModeRef = useRef(regionsMode);
  const completedRegionsRef = useRef(completedRegions);
  const onInformationRef = useRef(onInformation);
  const onRegionInformationRef = useRef(onRegionInformation);
  const selectingLocationRef = useRef(selectingLocation);
  const layerRefs = useRef(new Map<string, L.Path>());
  const regionLayerRefs = useRef(new Map<string, L.Path>());

  completedRef.current = completed;
  wishlistRef.current = wishlist;
  diffModeRef.current = diffMode;
  diffOnlyViewerRef.current = diffOnlyViewer;
  diffOnlyTargetRef.current = diffOnlyTarget;
  diffBothRef.current = diffBoth;
  regionsModeRef.current = regionsMode;
  completedRegionsRef.current = completedRegions;
  onInformationRef.current = onInformation;
  onRegionInformationRef.current = onRegionInformation;
  selectingLocationRef.current = selectingLocation;



  useEffect(() => {
    if (!_worldGeoCache) {
      fetchWorldGeo().then(setGeo).catch(() => setGeo(null));
    }
  }, []);

  useEffect(() => {
    if (regionsMode && !_regionsGeoCache) {
      fetchWorldRegionsGeo().then(setRegionsGeo).catch(() => setRegionsGeo(null));
    } else if (regionsMode && _regionsGeoCache) {
      setRegionsGeo(_regionsGeoCache);
    }
  }, [regionsMode]);

  const searchItems = useMemo<SearchItem[]>(() => {
    if (regionsMode && regionsGeo) {
      return regionsGeo.features.map((f: any) => ({
        id: f.properties?.id || "",
        name: f.properties?.name || "",
        nameLocal: f.properties?.name_local || "",
        type: "region",
        bounds: getLargestPolygonBounds(f),
        originalFeature: f
      }));
    } else if (!regionsMode) {
      return countriesWithCoords.map(c => {
        let bounds: any;
        if (geo) {
          const feature = geo.features.find((f: any) => resolveCountryFromFeature(f)?.id === c.id);
          if (feature) {
            bounds = getLargestPolygonBounds(feature);
          }
        }
        return {
          id: c.id,
          name: c.name,
          nameLocal: c.name,
          type: "country",
          coordinates: c.coordinates,
          bounds,
          originalData: c
        };
      });
    }
    return [];
  }, [regionsMode, regionsGeo, geo]);

  const handleSearchSelect = useCallback((item: SearchItem) => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);

    // Resetting first also restarts the effect when the same result is chosen twice.
    setSearchedId(null);
    scanFrameRef.current = requestAnimationFrame(() => {
      setSearchedId(item.id);
      scanTimerRef.current = setTimeout(() => {
        setSearchedId((current) => current === item.id ? null : current);
      }, 900);
    });
  }, []);

  useEffect(() => () => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
  }, []);

  const icons = useMemo(
    () => ({
      done: L.divIcon({
        className: "",
        html: '<span class="summit-pin summit-pin--done">✓</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      todo: L.divIcon({
        className: "",
        html: '<span class="summit-pin">◇</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      wishlist: L.divIcon({
        className: "",
        html: '<span class="summit-pin summit-pin--wishlist">★</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      diffOnlyMe: L.divIcon({
        className: "",
        html: '<span class="summit-pin summit-pin--diff-only-me">✓</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      diffOnlyThem: L.divIcon({
        className: "",
        html: '<span class="summit-pin summit-pin--diff-only-them"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      diffBoth: L.divIcon({
        className: "",
        html: '<span class="summit-pin summit-pin--diff-both">⬟</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      diffNone: L.divIcon({
        className: "",
        html: '<span class="summit-pin summit-pin--diff-none">◆</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }),
    [],
  );

  function getDiffIcon(countryId: string) {
    if (diffOnlyViewer?.has(countryId)) return icons.diffOnlyMe;
    if (diffOnlyTarget?.has(countryId)) return icons.diffOnlyThem;
    if (diffBoth?.has(countryId)) return icons.diffBoth;
    return icons.diffNone;
  }

  // ── Stable getDiffGeoStyle (reads from refs) ──
  const getDiffGeoStyleRef = useCallback((countryId: string) => {
    if (diffOnlyViewerRef.current?.has(countryId)) {
      return { color: "#4a2878", weight: 1.5, fillColor: "#7b52ab", fillOpacity: 0.8 };
    }
    if (diffOnlyTargetRef.current?.has(countryId)) {
      return { color: "#8c3a25", weight: 1.5, fillColor: "#c75a3a", fillOpacity: 0.75 };
    }
    if (diffBothRef.current?.has(countryId)) {
      return { color: "#9583ad", weight: 1.15, fillColor: "#c5b3da", fillOpacity: 0.65 };
    }
    return { color: "#c4bfb6", weight: 0.8, fillColor: "#e8e4df", fillOpacity: 0.4 };
  }, []);

  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const oldId = activeIdRef.current;
    if (oldId && oldId !== activeId) {
      const layer = layerRefs.current.get(oldId) || regionLayerRefs.current.get(oldId);
      if (layer) {
        if (diffModeRef.current) {
          const ds = getDiffGeoStyleRef(oldId);
          (layer as Path).setStyle({ weight: ds.weight, fillOpacity: ds.fillOpacity });
        } else {
          if (layerRefs.current.has(oldId)) {
            const isWishlist = wishlistRef.current.has(oldId);
            (layer as Path).setStyle({
              weight: 1.15,
              fillOpacity: completedRef.current.has(oldId) ? 0.83 : isWishlist ? 0.83 : 0.55,
            });
          }
          if (regionLayerRefs.current.has(oldId)) {
            const isDone = completedRegionsRef.current?.has(oldId);
            (layer as Path).setStyle({ fillOpacity: isDone ? 0.83 : 0.55, weight: 1.5 });
          }
        }
      }
    }

    if (activeId) {
      const layer = layerRefs.current.get(activeId) || regionLayerRefs.current.get(activeId);
      if (layer) {
        if (diffModeRef.current) {
          (layer as Path).setStyle({ weight: 2.5, fillOpacity: 0.9 });
        } else {
          if (layerRefs.current.has(activeId)) {
            const isWishlist = wishlistRef.current.has(activeId);
            (layer as Path).setStyle({
              weight: 2.5,
              fillOpacity: completedRef.current.has(activeId) ? 0.9 : isWishlist ? 0.9 : 0.75,
            });
          }
          if (regionLayerRefs.current.has(activeId)) {
            (layer as Path).setStyle({ fillOpacity: 0.9, weight: 2.5 });
          }
        }
      }
    }
    activeIdRef.current = activeId || null;
  }, [activeId, getDiffGeoStyleRef]);

  // ── Memoized style functions ──
  const geoStyle = useCallback(
    (f: any) => {
      const country = f ? resolveCountryFromFeature(f as any) : undefined;
      
      if (regionsMode) {
        // En modo regiones, las fronteras de los países son overlay grueso
        return {
          color: "#4a2878", // Fronteras de países bien visibles
          weight: 2.5,
          fill: false,      // Sin relleno para que se vean las regiones
          interactive: false // Para no bloquear clicks a las regiones
        };
      }

      if (diffMode && country) return getDiffGeoStyleRef(country.id);
      const isDone = country ? completed.has(country.id) : false;
      const isWishlist = country ? wishlist.has(country.id) : false;
      return {
        color: isDone ? "#4a2878" : isWishlist ? "#d2a54b" : "#9b8ab8",
        weight: 1.15,
        fillColor: isDone ? "#7b52ab" : isWishlist ? "#ecd9a5" : "#ece5f3",
        fillOpacity: isDone ? 0.83 : isWishlist ? 0.83 : 0.55
      };
    },
    [completed, wishlist, diffMode, regionsMode, getDiffGeoStyleRef],
  );

  const regionStyle = useCallback(
    (f: any) => {
      const regionId = f?.properties?.id;
      if (diffMode && regionId) {
        const ds = getDiffGeoStyleRef(regionId);
        return {
          ...ds,
          weight: 1.5,
        };
      }
      const isDone = completedRegions?.has(regionId);
      return {
        color: "#a69f93", // Fronteras un poco más marcadas
        weight: 1.5,
        fillColor: isDone ? "#7b52ab" : "#ece5f3",
        fillOpacity: isDone ? 0.83 : 0.55
      };
    },
    [completedRegions, diffMode, getDiffGeoStyleRef],
  );

  // ── Stable onEachFeature (uses refs) ──
  const onEachFeature = useCallback(
    (f: any, layer: L.Layer) => {
      if (regionsModeRef.current) return; // Las interacciones se manejan en regionsGeo si está activo

      const country = resolveCountryFromFeature(f as any);
      if (country) {
        layerRefs.current.set(country.id, layer as Path);
        const isDone = completedRef.current.has(country.id);
        const isWishlist = wishlistRef.current.has(country.id);
        const statusClass = isDone ? "tooltip-done" : isWishlist ? "tooltip-wishlist" : "tooltip-todo";
        layer.bindTooltip(country.name, { 
          sticky: true,
          className: `summit-tooltip ${statusClass}`,
        });
        layer.on("click", (e: L.LeafletMouseEvent) => {
          if (selectingLocationRef.current) return;
          onInformationRef.current(country);
        });

        layer.on("mouseover", () => {
          if (diffModeRef.current) {
            (layer as Path).setStyle({ weight: 2.5, fillOpacity: 0.9 });
          } else {
            const isWishlist = wishlistRef.current.has(country.id);
            (layer as Path).setStyle({
              weight: 2.5,
              fillOpacity: completedRef.current.has(country.id) ? 0.9 : isWishlist ? 0.9 : 0.75,
            });
          }
        });
        layer.on("mouseout", () => {
          if (country.id === activeIdRef.current) return;
          if (diffModeRef.current) {
            const ds = getDiffGeoStyleRef(country.id);
            (layer as Path).setStyle({ weight: ds.weight, fillOpacity: ds.fillOpacity });
          } else {
            const isWishlist = wishlistRef.current.has(country.id);
            (layer as Path).setStyle({
              weight: 1.15,
              fillOpacity: completedRef.current.has(country.id) ? 0.83 : isWishlist ? 0.83 : 0.55,
            });
          }
        });
      }
    },
    [getDiffGeoStyleRef],
  );

  const onEachRegion = useCallback(
    (f: any, layer: L.Layer) => {
      const name = f?.properties?.name;
      const isoA2 = f?.properties?.iso_a2;
      if (name) {
        const regionId = f.properties.id;
        regionLayerRefs.current.set(regionId, layer as Path);
        const isDone = completedRegionsRef.current?.has(regionId);
        const statusClass = isDone ? "tooltip-done" : "tooltip-todo";
        layer.bindTooltip(name, { 
          sticky: true,
          className: `summit-tooltip ${statusClass}`,
        });

        layer.on("click", () => {
          if (onRegionInformationRef.current) {
            onRegionInformationRef.current(regionId, name, isoA2);
          }
        });

        // Hover effect for region
        layer.on("mouseover", () => {
          (layer as Path).setStyle({ fillOpacity: 0.9, weight: 2.5 });
        });
        layer.on("mouseout", () => {
          if (regionId === activeIdRef.current) return;
          if (diffModeRef.current) {
            const ds = getDiffGeoStyleRef(regionId);
            (layer as Path).setStyle({ fillOpacity: ds.fillOpacity, weight: 1.5 });
          } else {
            const isDone = completedRegionsRef.current?.has(regionId);
            (layer as Path).setStyle({ fillOpacity: isDone ? 0.83 : 0.55, weight: 1.5 });
          }
        });
      }
    },
    [getDiffGeoStyleRef],
  );



  // ── Memoized markers ──
  const markers = useMemo(
    () => {
      const showCountryMarkers = !regionsMode || diffMode;

      let cMarkers: React.ReactNode[] = [];
      if (showCountryMarkers) {
        cMarkers = countriesWithCoords.map((c) => (
        <Marker
          key={`${c.id}-${diffMode ? "d" : "n"}`}
          position={c.coordinates!}
          icon={
            diffMode
              ? getDiffIcon(c.id)
              : completed.has(c.id) ? icons.done : wishlist.has(c.id) ? icons.wishlist : icons.todo
          }
          eventHandlers={{
            click: () => {
              if (selectingLocation) return;
              onInformation(c);
            }
          }}
        />
      ));
      }

      if (experienceRecords) {
        const expMarkers = experienceRecords.map((r, i) => {
          const iconHtml = ReactDOMServer.renderToString(
            <span className="summit-pin summit-pin--experience summit-pin--done">
              {getIconComponent(r.icon_name)}
            </span>
          );
          
          const expIcon = L.divIcon({
            className: "",
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          
          return (
            <Marker
              key={`exp-${r.id || i}`}
              position={[r.lat, r.lng]}
              icon={expIcon}
              eventHandlers={{
                click: () => onExperienceClick && onExperienceClick(r),
              }}
            />
          );
        });
        return [...cMarkers, ...expMarkers];
      }

      return cMarkers;
    },
    [completed, wishlist, diffMode, regionsMode, experiencesMode, experienceRecords, diffOnlyViewer, diffOnlyTarget, diffBoth, icons, onInformation, onExperienceClick, selectingLocation],
  );

  return (
    <>
      <MapContainer
        className="map"
      scrollWheelZoom={true}
      preferCanvas={true}
      minZoom={1}
      maxZoom={12}
      maxBounds={[
        [-85, -180],
        [85, 180]
      ]}
      maxBoundsViscosity={0.5}
    >
      <FitWorld />
      <MapZoomListener />
      <MapClickListener onMapClick={onMapClick} selectingLocation={selectingLocation} />
      <SweepOverlay searchedId={searchedId} layerRefs={layerRefs} regionLayerRefs={regionLayerRefs} />

      {experiencesMode && onAddExperience && (
        <div className="leaflet-control-container">
          <div className="leaflet-top leaflet-left" style={{ pointerEvents: 'none', zIndex: 1000 }}>
            <div className="leaflet-control leaflet-bar" style={{ pointerEvents: 'auto', marginTop: 80, marginLeft: 10 }}>
              <a
                href="#"
                role="button"
                title="Añadir experiencia en el mapa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  textDecoration: 'none',
                  color: 'black'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f4f4f4'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddExperience();
                }}
              >
                <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}


      {selectingLocation && (
        <div className="leaflet-control-container">
          <div className="leaflet-top leaflet-center" style={{ pointerEvents: 'none', zIndex: 1000, width: '100%', display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <div className="leaflet-control" style={{ 
              pointerEvents: 'auto', background: 'var(--pine)', color: '#fff', 
              padding: '12px 16px', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
              display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, 
              fontWeight: 500, fontSize: '0.9rem', maxWidth: 360, width: '90%', textAlign: 'center' 
            }}>
              <span style={{ display: 'inline', lineHeight: 1.4, fontSize: '14px' }}>
                Haz clic en el mapa para situar la experiencia o busca el lugar aquí
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: 'text-bottom', marginLeft: 4, opacity: 0.8 }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
            </div>
          </div>
        </div>
      )}
      {!selectingLocation && (
        <MapSearchControl 
          items={searchItems} 
          onSelect={handleSearchSelect} 
          placeholder={regionsMode ? "Buscar región..." : "Buscar país..."} 
        />
      )}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        keepBuffer={40}
        updateWhenIdle={false}
        updateWhenZooming={true}
      />
      {regionsMode && regionsGeo && (
        <GeoJSON
          key="regions"
          data={regionsGeo}
          style={regionStyle}
          onEachFeature={onEachRegion}
        />
      )}
      {geo && (
        <GeoJSON
          key={`countries-${regionsMode ? "overlay" : diffMode ? "diff" : "normal"}`}
          data={geo}
          style={geoStyle}
          onEachFeature={onEachFeature}
          interactive={!regionsMode} // Make non-interactive in regions mode so region tooltips work
        />
      )}
      {markers}
    </MapContainer>
    </>
  );
}
