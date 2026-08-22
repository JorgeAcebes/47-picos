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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { peakByCode, type Peak } from "@/data/peaks";
import { MapSearchControl, type SearchItem } from "./map-search";

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
};

function FitSpain() {
  const map = useMap();
  useEffect(() => {
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

// ── Stable marker list (never changes) ────
const peakEntries = Object.values(peakByCode);

export function SpainMap({ completed, wishlist, onInformation, onComplete, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(_geoCache);
  const [searchedId, setSearchedId] = useState<string | null>(null);

  // Use refs for values accessed inside Leaflet event handlers
  // so we don't recreate onEachFeature on every prop change
  const completedRef = useRef(completed);
  const wishlistRef = useRef(wishlist);
  const diffModeRef = useRef(diffMode);
  const diffOnlyViewerRef = useRef(diffOnlyViewer);
  const diffOnlyTargetRef = useRef(diffOnlyTarget);
  const diffBothRef = useRef(diffBoth);
  const onInformationRef = useRef(onInformation);

  completedRef.current = completed;
  wishlistRef.current = wishlist;
  diffModeRef.current = diffMode;
  diffOnlyViewerRef.current = diffOnlyViewer;
  diffOnlyTargetRef.current = diffOnlyTarget;
  diffBothRef.current = diffBoth;
  onInformationRef.current = onInformation;

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

  // ── Memoized style function (recreated only when data deps change) ──
  const geoStyle = useCallback(
    (feature: any) => {
      const code = String(feature?.properties?.Codigo ?? "");
      const isSearched = searchedId === code;
      if (diffMode) return getDiffStyleRef(code);
      const isDone = completed.has(code);
      const isWishlist = wishlist.has(code);
      return {
        color: isDone ? "#245f52" : isWishlist ? "#d2a54b" : "#8bb8ae",
        weight: isSearched ? 2.5 : 1.15,
        fillColor: isDone ? "#5c9b7d" : isWishlist ? "#ecd9a5" : "#e7f1ea",
        fillOpacity: isDone ? 0.83 : isWishlist ? 0.83 : 0.72,
        className: isSearched ? "blink-polygon" : ""
      };
    },
    [completed, wishlist, diffMode, searchedId, getDiffStyleRef],
  );

  // ── Stable onEachFeature (uses refs to avoid GeoJSON remount) ──
  const onEachFeature = useCallback(
    (feature: any, layer: L.Layer) => {
      const peak = peakByCode[String(feature.properties?.Codigo ?? "")];
      if (peak) {
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

  const searchItems = useMemo<SearchItem[]>(() => {
    return peakEntries.map(peak => ({
      id: peak.code,
      name: peak.name,
      nameLocal: peak.province,
      type: "peak",
      coordinates: peak.coordinates,
      originalData: peak
    }));
  }, []);

  const handleSearchSelect = useCallback((item: SearchItem) => {
    setTimeout(() => {
      setSearchedId(item.id);
      setTimeout(() => {
        setSearchedId((current) => current === item.id ? null : current);
      }, 750); // Wait 0.75s for blink animation
    }, 1300); // Wait for flyToBounds (0.8s) + 0.5s pause
  }, []);

  // ── Memoized markers to avoid re-rendering all 52 on every parent render ──
  const markers = useMemo(
    () =>
      peakEntries.map((peak) => (
        <Marker
          key={`${peak.code}-${diffMode ? "d" : "n"}`}
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
      <MapSearchControl 
        items={searchItems} 
        onSelect={handleSearchSelect} 
        placeholder="Buscar pico o provincia..." 
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        keepBuffer={6}
        updateWhenIdle={false}
        updateWhenZooming={false}
      />
      {geo && (
        <GeoJSON
          key={diffMode ? "diff" : "normal"}
          data={geo}
          style={geoStyle}
          onEachFeature={onEachFeature}
        />
      )}
      {markers}
    </MapContainer>
  );
}
