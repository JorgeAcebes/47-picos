"use client";

import * as L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  Marker,
  useMap,
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
  onInformation: (country: Country) => void;
  onComplete: (country: Country) => void;
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

export function WorldMap({ completed, onInformation, onComplete }: Props) {
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
    }),
    [],
  );

  return (
    <MapContainer
      className="map"
      scrollWheelZoom={true}
      minZoom={2}
      maxZoom={7}
    >
      <FitWorld />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geo && (
        <GeoJSON
          data={geo}
          style={(f) => {
            const country = f ? resolveCountryFromFeature(f as any) : undefined;
            const isDone = country ? completed.has(country.id) : false;
            return {
              color: isDone ? "#4a2878" : "#9b8ab8",
              weight: 1.15,
              fillColor: isDone ? "#7b52ab" : "#ece5f3",
              fillOpacity: isDone ? 0.83 : 0.55,
            };
          }}
          onEachFeature={(f, layer) => {
            const country = resolveCountryFromFeature(f as any);
            if (country) {
              layer.bindTooltip(country.name, { sticky: true });
              layer.on("click", () => onInformation(country));

              layer.on("mouseover", () => {
                (layer as Path).setStyle({
                  weight: 2.5,
                  fillOpacity: completed.has(country.id) ? 0.9 : 0.75,
                });
              });
              layer.on("mouseout", () => {
                (layer as Path).setStyle({
                  weight: 1.15,
                  fillOpacity: completed.has(country.id) ? 0.83 : 0.55,
                });
              });
            }
          }}
        />
      )}
      {countries.map((c) => 
        c.coordinates ? (
          <Marker
            key={c.id}
            position={c.coordinates}
            icon={completed.has(c.id) ? icons.done : icons.todo}
            eventHandlers={{
              click: () => onInformation(c),
            }}
          />
        ) : null
      )}
    </MapContainer>
  );
}
