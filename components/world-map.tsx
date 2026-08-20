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

const WORLD_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ── Module-level GeoJSON cache ────────────
let _worldGeoCache: FeatureCollection | null = null;
let _worldGeoPromise: Promise<FeatureCollection> | null = null;

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
};

function FitWorld() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [-55, -170],
        [75, 180],
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

// ── Pre-filter countries with coordinates (stable list) ──
const countriesWithCoords = countries.filter((c) => c.coordinates);

export function WorldMap({ completed, wishlist, onInformation, onComplete, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(_worldGeoCache);

  // Use refs for values accessed inside Leaflet event handlers
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
    if (!_worldGeoCache) {
      fetchWorldGeo().then(setGeo).catch(() => setGeo(null));
    }
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

  // ── Memoized style function ──
  const geoStyle = useCallback(
    (f: any) => {
      const country = f ? resolveCountryFromFeature(f as any) : undefined;
      if (diffMode && country) return getDiffGeoStyleRef(country.id);
      const isDone = country ? completed.has(country.id) : false;
      const isWishlist = country ? wishlist.has(country.id) : false;
      return {
        color: isDone ? "#4a2878" : isWishlist ? "#d2a54b" : "#9b8ab8",
        weight: 1.15,
        fillColor: isDone ? "#7b52ab" : isWishlist ? "#ecd9a5" : "#ece5f3",
        fillOpacity: isDone ? 0.83 : isWishlist ? 0.83 : 0.55,
      };
    },
    [completed, wishlist, diffMode, getDiffGeoStyleRef],
  );

  // ── Stable onEachFeature (uses refs) ──
  const onEachFeature = useCallback(
    (f: any, layer: L.Layer) => {
      const country = resolveCountryFromFeature(f as any);
      if (country) {
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

  // ── Memoized markers ──
  const markers = useMemo(
    () =>
      countriesWithCoords.map((c) => (
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
      )),
    [completed, wishlist, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth, icons, onInformation],
  );

  return (
    <MapContainer
      className="map"
      scrollWheelZoom={true}
      preferCanvas={true}
      minZoom={1}
      maxZoom={7}
      maxBounds={[
        [-85, -180],
        [85, 180]
      ]}
      maxBoundsViscosity={0.5}
    >
      <FitWorld />
      <MapZoomListener />
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
