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

export function SpainMap({ completed, wishlist, onInformation, onComplete }: Props) {
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
    }),
    [],
  );

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
          data={geo}
          style={(feature) => {
            const code = String(feature?.properties?.Codigo ?? "");
            const isDone = completed.has(code);
            const isWishlist = wishlist.has(code);
            return {
              color: isDone ? "#245f52" : isWishlist ? "#d2a54b" : "#8bb8ae",
              weight: 1.15,
              fillColor: isDone ? "#5c9b7d" : isWishlist ? "#ecd9a5" : "#e7f1ea",
              fillOpacity: isDone ? 0.83 : isWishlist ? 0.83 : 0.72,
              // Smooth transition on polygon hover
            };
          }}
          onEachFeature={(feature, layer) => {
            const peak = peakByCode[String(feature.properties?.Codigo ?? "")];
            if (peak) {
              layer.bindTooltip(`${peak.province}: ${peak.name}`, {
                sticky: true,
              });
              layer.on("click", () => onInformation(peak));

              // Hover effect on province polygons
              layer.on("mouseover", () => {
                const isWishlist = wishlist.has(peak.code);
                (layer as L.Path).setStyle({
                  weight: 2.5,
                  fillOpacity: completed.has(peak.code) ? 0.9 : isWishlist ? 0.9 : 0.85,
                });
              });
              layer.on("mouseout", () => {
                const isWishlist = wishlist.has(peak.code);
                (layer as L.Path).setStyle({
                  weight: 1.15,
                  fillOpacity: completed.has(peak.code) ? 0.83 : isWishlist ? 0.83 : 0.72,
                });
              });
            }
          }}
        />
      )}
      {Object.values(peakByCode).map((peak) => (
        <Marker
          key={peak.id}
          position={peak.coordinates}
          icon={completed.has(peak.code) ? markerIcons.done : wishlist.has(peak.code) ? markerIcons.wishlist : markerIcons.todo}
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
