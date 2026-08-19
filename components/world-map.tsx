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
import { useEffect, useState, useMemo } from "react";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { countries, resolveCountryFromFeature, type Country } from "@/data/countries";

const WORLD_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

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

export function WorldMap({ completed, wishlist, onInformation, onComplete, diffMode, diffOnlyViewer, diffOnlyTarget, diffBoth }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((response) => response.json())
      .then((topology: Topology) => {
        const countriesGeo = feature(
          topology,
          topology.objects.countries as any,
        ) as unknown as FeatureCollection;
        fixAntimeridian(countriesGeo);
        setGeo(countriesGeo);
      })
      .catch(() => setGeo(null));
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
        html: '<span class="summit-pin">◆</span>',
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

  function getDiffGeoStyle(countryId: string) {
    if (diffOnlyViewer?.has(countryId)) {
      return { color: "#4a2878", weight: 1.5, fillColor: "#7b52ab", fillOpacity: 0.8 };
    }
    if (diffOnlyTarget?.has(countryId)) {
      return { color: "#8c3a25", weight: 1.5, fillColor: "#c75a3a", fillOpacity: 0.75 };
    }
    if (diffBoth?.has(countryId)) {
      return { color: "#9583ad", weight: 1.15, fillColor: "#c5b3da", fillOpacity: 0.65 };
    }
    return { color: "#c4bfb6", weight: 0.8, fillColor: "#e8e4df", fillOpacity: 0.4 };
  }

  return (
    <MapContainer
      className="map"
      scrollWheelZoom={true}
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
      />
      {geo && (
        <GeoJSON
          key={diffMode ? "diff" : "normal"}
          data={geo}
          style={(f) => {
            const country = f ? resolveCountryFromFeature(f as any) : undefined;
            if (diffMode && country) return getDiffGeoStyle(country.id);
            const isDone = country ? completed.has(country.id) : false;
            const isWishlist = country ? wishlist.has(country.id) : false;
            return {
              color: isDone ? "#4a2878" : isWishlist ? "#d2a54b" : "#9b8ab8",
              weight: 1.15,
              fillColor: isDone ? "#7b52ab" : isWishlist ? "#ecd9a5" : "#ece5f3",
              fillOpacity: isDone ? 0.83 : isWishlist ? 0.83 : 0.55,
            };
          }}
          onEachFeature={(f, layer) => {
            const country = resolveCountryFromFeature(f as any);
            if (country) {
              layer.bindTooltip(country.name, { sticky: true });
              layer.on("click", () => onInformation(country));

              layer.on("mouseover", () => {
                if (diffMode) {
                  (layer as Path).setStyle({ weight: 2.5, fillOpacity: 0.9 });
                } else {
                  const isWishlist = wishlist.has(country.id);
                  (layer as Path).setStyle({
                    weight: 2.5,
                    fillOpacity: completed.has(country.id) ? 0.9 : isWishlist ? 0.9 : 0.75,
                  });
                }
              });
              layer.on("mouseout", () => {
                if (diffMode) {
                  const ds = getDiffGeoStyle(country.id);
                  (layer as Path).setStyle({ weight: ds.weight, fillOpacity: ds.fillOpacity });
                } else {
                  const isWishlist = wishlist.has(country.id);
                  (layer as Path).setStyle({
                    weight: 1.15,
                    fillOpacity: completed.has(country.id) ? 0.83 : isWishlist ? 0.83 : 0.55,
                  });
                }
              });
            }
          }}
        />
      )}
      {countries.map((c) => 
        c.coordinates ? (
          <Marker
            key={`${c.id}-${diffMode ? "d" : "n"}`}
            position={c.coordinates}
            icon={
              diffMode
                ? getDiffIcon(c.id)
                : completed.has(c.id) ? icons.done : wishlist.has(c.id) ? icons.wishlist : icons.todo
            }
            eventHandlers={{
              click: () => onInformation(c),
            }}
          />
        ) : null
      )}
    </MapContainer>
  );
}
