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
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { countries, resolveCountryFromFeature, type Country } from "@/data/countries";
import { regionsByCountryIsoA2 } from "@/data/regions";
import { MapSearchControl, type SearchItem } from "./map-search";

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
};

function FitWorld() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds([
        [-60, -180],
        [80, 180]
      ], { padding: [0, 0] });
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/**
 * Leaflet owns the geometry attributes, so the white sweep lives in a temporary
 * SVG definition instead of changing the country/region's own paint.
 */
function SweepDefsInjector({ searchedId }: { searchedId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!searchedId) return;
    const overlayPane = map.getPane("overlayPane");
    if (!overlayPane) return;
    const svg = overlayPane.querySelector("svg");
    if (!svg) return;

    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.prepend(defs);
    }

    const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", `sweep-${searchedId}`);
    grad.setAttribute("x1", "-32%");
    grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "18%");
    grad.setAttribute("y2", "0%");
    grad.setAttribute("gradientUnits", "objectBoundingBox");

    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#fff");
    stop1.setAttribute("stop-opacity", "0");

    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "50%");
    stop2.setAttribute("stop-color", "#fff");
    stop2.setAttribute("stop-opacity", "1");

    const stop3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop3.setAttribute("offset", "100%");
    stop3.setAttribute("stop-color", "#fff");
    stop3.setAttribute("stop-opacity", "0");

    const anim1 = document.createElementNS("http://www.w3.org/2000/svg", "animate");
    anim1.setAttribute("attributeName", "x1");
    anim1.setAttribute("from", "-32%");
    anim1.setAttribute("to", "100%");
    anim1.setAttribute("dur", "0.85s");
    anim1.setAttribute("fill", "freeze");

    const anim2 = document.createElementNS("http://www.w3.org/2000/svg", "animate");
    anim2.setAttribute("attributeName", "x2");
    anim2.setAttribute("from", "18%");
    anim2.setAttribute("to", "150%");
    anim2.setAttribute("dur", "0.85s");
    anim2.setAttribute("fill", "freeze");

    grad.appendChild(stop1);
    grad.appendChild(stop2);
    grad.appendChild(stop3);
    grad.appendChild(anim1);
    grad.appendChild(anim2);

    defs.appendChild(grad);

    return () => {
      defs?.removeChild(grad);
    };
  }, [searchedId, map]);

  return null;
}

function MapZoomListener() {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      const container = map.getContainer();
      container.setAttribute("data-zoom", zoom.toString());
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

export function WorldMap({ completed, wishlist, onInformation, onRegionInformation, onComplete, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth, regionsMode, completedRegions }: Props) {
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
        layer.on("click", () => onInformationRef.current(country));

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

  useEffect(() => {
    if (searchedId) {
      const layer = layerRefs.current.get(searchedId) || regionLayerRefs.current.get(searchedId);
      if (!layer) return;

      const layers: L.Path[] = [];
      if ('eachLayer' in layer) {
        (layer as unknown as L.LayerGroup).eachLayer(l => layers.push(l as L.Path));
      } else {
        layers.push(layer as L.Path);
      }

      const clones: SVGElement[] = [];
      // Wait one frame so the <defs> effect has inserted the gradient first.
      const frame = requestAnimationFrame(() => {
        layers.forEach(l => {
          const el = l.getElement();
          if (!el?.parentNode) return;

          const clone = el.cloneNode(true) as SVGElement;
          // The source geometry is never touched: this is a pure temporary overlay.
          ["style", "class", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity"]
            .forEach(attribute => clone.removeAttribute(attribute));
          clone.setAttribute("fill", `url(#sweep-${searchedId})`);
          clone.setAttribute("fill-opacity", "1");
          clone.setAttribute("stroke", "#fff");
          clone.setAttribute("stroke-width", "0");
          clone.setAttribute("stroke-opacity", "0");
          clone.setAttribute("vector-effect", "non-scaling-stroke");
          clone.setAttribute("aria-hidden", "true");
          clone.classList.add("map-search-scan-overlay");
          el.parentNode.appendChild(clone);
          clones.push(clone);
        });
      });

      return () => {
        cancelAnimationFrame(frame);
        clones.forEach(clone => {
          if (clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
        });
      };
    }
  }, [searchedId]);

  // ── Memoized markers ──
  const markers = useMemo(
    () => {
      if (regionsMode) return null; // No icons in regions mode

      return countriesWithCoords.map((c) => (
        <Marker
          key={`${c.id}-${diffMode ? "d" : "n"}`}
          position={c.coordinates!}
          icon={
            diffMode
              ? getDiffIcon(c.id)
              : completed.has(c.id) ? icons.done : wishlist.has(c.id) ? icons.wishlist : icons.todo
          }
          eventHandlers={{
            click: () => onInformation(c),
          }}
        />
      ));
    },
    [completed, wishlist, diffMode, regionsMode, diffOnlyViewer, diffOnlyTarget, diffBoth, icons, onInformation],
  );

  return (
    <>
      <MapContainer
        className="map"
      scrollWheelZoom={true}
      preferCanvas={false}
      minZoom={1}
      maxZoom={12}
      maxBounds={[
        [-85, -180],
        [85, 180]
      ]}
      maxBoundsViscosity={0.5}
    >
      <SweepDefsInjector searchedId={searchedId} />
      <FitWorld />
      <MapZoomListener />
      <MapSearchControl 
        items={searchItems} 
        onSelect={handleSearchSelect} 
        placeholder={regionsMode ? "Buscar región..." : "Buscar país..."} 
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        keepBuffer={6}
        updateWhenIdle={false}
        updateWhenZooming={false}
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
