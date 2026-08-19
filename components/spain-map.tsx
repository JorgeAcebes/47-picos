"use client";

import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { peakByCode, type Peak } from "@/data/peaks";

const PROVINCES_URL =
  "https://gist.githubusercontent.com/josemamira/3af52a4698d42b3f676fbc23f807a605/raw/cc5e247b63b05520c167639ed51d61acd560b1c1/provincias_spain.geojson";

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

export function SpainMap({ completed, wishlist, onInformation, onComplete, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch(PROVINCES_URL)
      .then((response) => response.json())
      .then(setGeo)
      .catch(() => setGeo(null));
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
        html: '<span class="summit-pin">▲</span>',
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
        html: '<span class="summit-pin summit-pin--diff-none">▲</span>',
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

  function getDiffStyle(code: string) {
    if (diffOnlyViewer?.has(code)) {
      return { color: "#245f52", weight: 1.5, fillColor: "#5c9b7d", fillOpacity: 0.8 };
    }
    if (diffOnlyTarget?.has(code)) {
      return { color: "#8c3a25", weight: 1.5, fillColor: "#c75a3a", fillOpacity: 0.75 };
    }
    if (diffBoth?.has(code)) {
      return { color: "#7da894", weight: 1.15, fillColor: "#bcd4c8", fillOpacity: 0.7 };
    }
    return { color: "#c4bfb6", weight: 0.8, fillColor: "#e8e4df", fillOpacity: 0.45 };
  }

  return (
    <MapContainer
      className="map map-spain"
      scrollWheelZoom={true}
      minZoom={3}
      maxZoom={10}
      maxBounds={[
        [24, -22],
        [46, 8]
      ]}
      maxBoundsViscosity={0.5}
    >
      <FitSpain />
      <MapZoomListener />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geo && (
        <GeoJSON
          key={diffMode ? "diff" : "normal"}
          data={geo}
          style={(feature) => {
            const code = String(feature?.properties?.Codigo ?? "");
            if (diffMode) return getDiffStyle(code);
            const isDone = completed.has(code);
            const isWishlist = wishlist.has(code);
            return {
              color: isDone ? "#245f52" : isWishlist ? "#d2a54b" : "#8bb8ae",
              weight: 1.15,
              fillColor: isDone ? "#5c9b7d" : isWishlist ? "#ecd9a5" : "#e7f1ea",
              fillOpacity: isDone ? 0.83 : isWishlist ? 0.83 : 0.72,
            };
          }}
          onEachFeature={(feature, layer) => {
            const peak = peakByCode[String(feature.properties?.Codigo ?? "")];
            if (peak) {
              layer.bindTooltip(`${peak.province}: ${peak.name}`, {
                sticky: true,
              });
              layer.on("click", () => onInformation(peak));

              layer.on("mouseover", () => {
                if (diffMode) {
                  (layer as L.Path).setStyle({ weight: 2.5, fillOpacity: 0.9 });
                } else {
                  const isWishlist = wishlist.has(peak.code);
                  (layer as L.Path).setStyle({
                    weight: 2.5,
                    fillOpacity: completed.has(peak.code) ? 0.9 : isWishlist ? 0.9 : 0.85,
                  });
                }
              });
              layer.on("mouseout", () => {
                if (diffMode) {
                  const ds = getDiffStyle(peak.code);
                  (layer as L.Path).setStyle({ weight: ds.weight, fillOpacity: ds.fillOpacity });
                } else {
                  const isWishlist = wishlist.has(peak.code);
                  (layer as L.Path).setStyle({
                    weight: 1.15,
                    fillOpacity: completed.has(peak.code) ? 0.83 : isWishlist ? 0.83 : 0.72,
                  });
                }
              });
            }
          }}
        />
      )}
      {Object.values(peakByCode).map((peak) => (
        <Marker
          key={`${peak.code}-${diffMode ? "d" : "n"}`}
          position={peak.coordinates}
          icon={
            diffMode
              ? getDiffIcon(peak.code)
              : completed.has(peak.code) ? markerIcons.done : wishlist.has(peak.code) ? markerIcons.wishlist : markerIcons.todo
          }
        >
          <Popup className="peak-popup" closeButton={false}>
            <div className="popup-content">
              <span className="eyebrow">{peak.province}</span>
              <strong>{peak.name}</strong>
              <span>
                {peak.altitude.toLocaleString("es-ES")} m · {peak.range}
              </span>
              <div className="popup-actions">
                <button
                  className="button button--quiet"
                  onClick={() => onInformation(peak)}
                >
                  Información
                </button>
                <button
                  className="button button--green"
                  onClick={() => onComplete(peak)}
                >
                  {completed.has(peak.code)
                    ? "Actualizar registro"
                    : "Marcar completado"}
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
