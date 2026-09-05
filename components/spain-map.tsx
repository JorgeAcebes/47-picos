"use client";

import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { FeatureCollection } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { peakByCode, type Peak } from "@/data/peaks";
import { MapSearchControl, type SearchItem } from "./map-search";
import { SweepOverlay } from "./sweep-overlay";

// Override Leaflet's default canvas padding to preload vector shapes far outside the viewport
L.Canvas.prototype.options.padding = 1.5;

const PROVINCES_URL =
  "https://gist.githubusercontent.com/josemamira/3af52a4698d42b3f676fbc23f807a605/raw/cc5e247b63b05520c167639ed51d61acd560b1c1/provincias_spain.geojson";

// ── Module-level GeoJSON cache ────────────
let _geoCache: FeatureCollection | null = null;
let _geoPromise: Promise<FeatureCollection> | null = null;

function fetchProvinces(): Promise<FeatureCollection> {
  if (_geoCache) return Promise.resolve(_geoCache);
  if (!_geoPromise) {
    _geoPromise = fetch(PROVINCES_URL)
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        _geoCache = data;
        return data;
      });
  }
  return _geoPromise;
}

type Props = {
  completed: Set<string>;
  wishlist: Set<string>;
  onInformation: (peak: Peak) => void;
  onComplete: (peak: Peak) => void;
  diffMode?: boolean;
  diffOnlyViewer?: Set<string>;
  diffOnlyTarget?: Set<string>;
  diffBoth?: Set<string>;
  activeId?: string;
};

function FitSpain() {
  const map = useMap();
  useEffect(() => {
    if (window.location.hash.startsWith("#panel=")) {
      const saved = sessionStorage.getItem("mapState_spain");
      if (saved) {
        try {
          const { zoom, center } = JSON.parse(saved);
          map.setView(center, zoom, { animate: false });
          return;
        } catch (e) {}
      }
    }
    map.fitBounds(
      [
        [27.55, -18.65],
        [43.95, 4.95],
      ],
      { padding: [12, 12] },
    );
  }, [map]);
  return null;
}




function MapZoomListener() {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      sessionStorage.setItem("mapState_spain", JSON.stringify({ zoom, center }));
      const container = map.getContainer();
      container.setAttribute("data-zoom", zoom.toString());
    },
    moveend: () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      sessionStorage.setItem("mapState_spain", JSON.stringify({ zoom, center }));
    },
  });
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("data-zoom", map.getZoom().toString());
  }, [map]);
  return null;
}

// ── Stable marker list (never changes) ────
const peakEntries = Object.values(peakByCode);

export const SpainMap = memo(function SpainMap({ completed, wishlist, onInformation, onComplete, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth, activeId }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(_geoCache);
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  // Use refs for values accessed inside Leaflet event handlers
  // so we don't recreate onEachFeature on every prop change
  const completedRef = useRef(completed);
  const wishlistRef = useRef(wishlist);
  const diffModeRef = useRef(diffMode);
  const diffOnlyViewerRef = useRef(diffOnlyViewer);
  const diffOnlyTargetRef = useRef(diffOnlyTarget);
  const diffBothRef = useRef(diffBoth);
  const onInformationRef = useRef(onInformation);
  const layerRefs = useRef(new Map<string, L.Path>());

  completedRef.current = completed;
  wishlistRef.current = wishlist;
  diffModeRef.current = diffMode;
  diffOnlyViewerRef.current = diffOnlyViewer;
  diffOnlyTargetRef.current = diffOnlyTarget;
  diffBothRef.current = diffBoth;
  onInformationRef.current = onInformation;

  const activeCode = useMemo(() => {
    if (!activeId) return null;
    const peak = peakEntries.find(p => p.id === activeId);
    return peak ? peak.code : null;
  }, [activeId]);

  const activeCodeRef = useRef<string | null>(null);


  useEffect(() => {
    if (!_geoCache) {
      fetchProvinces().then(setGeo).catch(() => setGeo(null));
    }
  }, []);

  const markerIcons = useMemo(
    () => ({
      done: L.divIcon({
        className: "",
        html: '<span class="summit-pin summit-pin--done">✓</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      todo: L.divIcon({
        className: "",
        html: '<span class="summit-pin">△</span>',
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
        html: '<span class="summit-pin summit-pin--diff-none">△</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }),
    [],
  );

  function getDiffIcon(code: string) {
    if (diffOnlyViewer?.has(code)) return markerIcons.diffOnlyMe;
    if (diffOnlyTarget?.has(code)) return markerIcons.diffOnlyThem;
    if (diffBoth?.has(code)) return markerIcons.diffBoth;
    return markerIcons.diffNone;
  }

  // ── Stable getDiffStyle (reads from refs) ──
  const getDiffStyleRef = useCallback((code: string) => {
    if (diffOnlyViewerRef.current?.has(code)) {
      return { color: "#245f52", weight: 1.5, fillColor: "#5c9b7d", fillOpacity: 0.8 };
    }
    if (diffOnlyTargetRef.current?.has(code)) {
      return { color: "#8c3a25", weight: 1.5, fillColor: "#c75a3a", fillOpacity: 0.75 };
    }
    if (diffBothRef.current?.has(code)) {
      return { color: "#7da894", weight: 1.15, fillColor: "#bcd4c8", fillOpacity: 0.7 };
    }
    return { color: "#c4bfb6", weight: 0.8, fillColor: "#e8e4df", fillOpacity: 0.45 };
  }, []);

  useEffect(() => {
    const oldCode = activeCodeRef.current;
    if (oldCode && oldCode !== activeCode) {
      const layer = layerRefs.current.get(oldCode);
      if (layer) {
        if (diffModeRef.current) {
          const ds = getDiffStyleRef(oldCode);
          layer.setStyle({ weight: ds.weight, fillOpacity: ds.fillOpacity });
        } else {
          const isWishlist = wishlistRef.current.has(oldCode);
          layer.setStyle({
            weight: 1.15,
            fillOpacity: completedRef.current.has(oldCode) ? 0.83 : isWishlist ? 0.83 : 0.72,
          });
        }
      }
    }

    if (activeCode) {
      const layer = layerRefs.current.get(activeCode);
      if (layer) {
        if (diffModeRef.current) {
          layer.setStyle({ weight: 2.5, fillOpacity: 0.9 });
        } else {
          const isWishlist = wishlistRef.current.has(activeCode);
          layer.setStyle({
            weight: 2.5,
            fillOpacity: completedRef.current.has(activeCode) ? 0.9 : isWishlist ? 0.9 : 0.85,
          });
        }
      }
    }
    activeCodeRef.current = activeCode || null;
  }, [activeCode, getDiffStyleRef]);


  // ── Memoized style function (recreated only when data deps change) ──
  const geoStyle = useCallback(
    (feature: any) => {
      const code = String(feature?.properties?.Codigo ?? "");
      if (diffMode) return getDiffStyleRef(code);
      const isDone = completed.has(code);
      const isWishlist = wishlist.has(code);
      return {
        color: isDone ? "#245f52" : isWishlist ? "#d2a54b" : "#8bb8ae",
        weight: 1.15,
        fillColor: isDone ? "#5c9b7d" : isWishlist ? "#ecd9a5" : "#e7f1ea",
        fillOpacity: isDone ? 0.83 : isWishlist ? 0.83 : 0.72
      };
    },
    [completed, wishlist, diffMode, getDiffStyleRef],
  );

  // ── Stable onEachFeature (uses refs to avoid GeoJSON remount) ──
  const onEachFeature = useCallback(
    (feature: any, layer: L.Layer) => {
      const peak = peakByCode[String(feature.properties?.Codigo ?? "")];
      if (peak) {
        layerRefs.current.set(peak.code, layer as L.Path);
        const isDone = completedRef.current.has(peak.code);
        const isWishlist = wishlistRef.current.has(peak.code);
        const statusClass = isDone ? "tooltip-done" : isWishlist ? "tooltip-wishlist" : "tooltip-todo";

        layer.bindTooltip(`${peak.province}: ${peak.name}`, {
          sticky: true,
          className: `summit-tooltip ${statusClass}`,
        });
        layer.on("click", () => onInformationRef.current(peak));

        layer.on("mouseover", () => {
          if (diffModeRef.current) {
            (layer as L.Path).setStyle({ weight: 2.5, fillOpacity: 0.9 });
          } else {
            const isWishlist = wishlistRef.current.has(peak.code);
            (layer as L.Path).setStyle({
              weight: 2.5,
              fillOpacity: completedRef.current.has(peak.code) ? 0.9 : isWishlist ? 0.9 : 0.85,
            });
          }
        });
        layer.on("mouseout", () => {
          if (peak.code === activeCodeRef.current) return;
          if (diffModeRef.current) {
            const ds = getDiffStyleRef(peak.code);
            (layer as L.Path).setStyle({ weight: ds.weight, fillOpacity: ds.fillOpacity });
          } else {
            const isWishlist = wishlistRef.current.has(peak.code);
            (layer as L.Path).setStyle({
              weight: 1.15,
              fillOpacity: completedRef.current.has(peak.code) ? 0.83 : isWishlist ? 0.83 : 0.72,
            });
          }
        });
      }
    },
    [getDiffStyleRef],
  );



  // ── Reactively update layer styles without remounting GeoJSON ──
  useEffect(() => {
    layerRefs.current.forEach((layer) => {
      const feature = (layer as any).feature;
      if (feature) {
        layer.setStyle(geoStyle(feature));
      }
    });
  }, [geoStyle]);

  const searchItems = useMemo<SearchItem[]>(() => {
    return peakEntries.map(peak => {
      let bounds: any = undefined;
      if (geo) {
        // Encontrar los códigos de provincia que comparten este pico (por su id)
        const relatedCodes = peakEntries
          .filter(p => p.id === peak.id)
          .map(p => p.code);
        
        const relatedFeatures = geo.features.filter(f => 
          relatedCodes.includes(String(f.properties?.Codigo ?? ""))
        );

        if (relatedFeatures.length > 0) {
          bounds = L.geoJSON(relatedFeatures as any).getBounds();
        }
      }
      return {
        id: peak.code,
        name: peak.name,
        nameLocal: peak.province,
        type: "peak",
        coordinates: peak.coordinates,
        bounds,
        originalData: peak
      };
    });
  }, [geo]);

  const handleSearchSelect = useCallback((item: SearchItem) => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);

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

  const markers = useMemo(
    () =>
      peakEntries.map((peak) => (
        <Marker
          key={peak.code}
          position={peak.coordinates}
          icon={
            diffMode
              ? getDiffIcon(peak.code)
              : completed.has(peak.code) ? markerIcons.done : wishlist.has(peak.code) ? markerIcons.wishlist : markerIcons.todo
          }
          eventHandlers={{
            click: () => onInformation(peak),
          }}
        />
      )),
    [completed, wishlist, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth, markerIcons, onInformation],
  );

  return (
    <>
      <MapContainer
        className="map map-spain"
        scrollWheelZoom={true}
        preferCanvas={true}
        minZoom={4}
        maxZoom={10}
        maxBounds={[
          [24, -22],
          [46, 8]
        ]}
        maxBoundsViscosity={1.0}
      >
        <FitSpain />
      <MapZoomListener />
      <SweepOverlay searchedId={searchedId} layerRefs={layerRefs} />
      <MapSearchControl 
        items={searchItems} 
        onSelect={handleSearchSelect} 
        placeholder="Buscar pico o provincia..." 
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        keepBuffer={40}
        updateWhenIdle={false}
        updateWhenZooming={true}
      />
      {geo && (
        <GeoJSON
          key="spain-provinces"
          data={geo}
          style={geoStyle}
          onEachFeature={onEachFeature}
        />
      )}
      {markers}
    </MapContainer>
    </>
  );
});
