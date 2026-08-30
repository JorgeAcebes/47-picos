"use client";

import * as L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { Path } from "leaflet";
import type { FeatureCollection, Position } from "geojson";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { countries, resolveCountryFromFeature, type Country } from "@/data/countries";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { MapSearchControl, type SearchItem } from "./map-search";
import { SweepOverlay } from "./sweep-overlay";

// Override Leaflet's default canvas padding to preload vector shapes far outside the viewport
L.Canvas.prototype.options.padding = 1.5;

const WORLD_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

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

function FitWorld() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[-60, -180], [80, 180]], { padding: [0, 0] });
  }, [map]);
  return null;
}




function MapZoomListener() {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      const container = map.getContainer();
      if (zoom !== undefined) container.setAttribute("data-zoom", zoom.toString());
    },
  });
  useEffect(() => {
    const container = map.getContainer();
    const zoom = map.getZoom();
    if (zoom !== undefined) container.setAttribute("data-zoom", zoom.toString());
  }, [map]);
  return null;
}

type CollectiveSummitData = {
  summit_id: string;
  visitor_ids: string[];
  visitor_usernames: string[];
  visitor_avatars: string[];
};

type Props = {
  onClose: () => void;
};

export function CollectiveMap({ onClose }: Props) {
  const [scope, setScope] = useState<"all" | "following">("all");

  const [worldGeo, setWorldGeo] = useState<FeatureCollection | null>(_worldGeoCache);
  const [collectiveData, setCollectiveData] = useState<Map<string, CollectiveSummitData>>(new Map());
  const [loading, setLoading] = useState(true);
  
  const [selectedSummit, setSelectedSummit] = useState<{ id: string, name: string, visitors: { id: string; username: string; avatar: string }[] } | null>(null);
  const [searchedId, setSearchedId] = useState<string | null>(null);
  
  const layerRefs = useRef(new Map<string, L.Path>());
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);
  const scanFrameRef = useRef<number | null>(null);

  // Fetch GeoJSON
  useEffect(() => {
    if (!worldGeo) {
      fetchWorldGeo().then(setWorldGeo).catch(() => setWorldGeo(null));
    }
  }, [worldGeo]);

  // Fetch collective data
  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setSelectedSummit(null);
      setSearchedId(null);
      layerRefs.current.clear();
      
      const { data, error } = await supabase.rpc('get_collective_summits', {
        p_mode: "countries", // Always countries now
        p_following_only: scope === "following"
      });
      
      if (error) {
        console.error("Error fetching collective summits:", error);
        setLoading(false);
        return;
      }
      const map = new Map<string, CollectiveSummitData>();
      if (data) {
        for (const row of data as CollectiveSummitData[]) {
          map.set(row.summit_id, row);
        }
      }
      setCollectiveData(map);
      setLoading(false);
    }
    fetchData();
  }, [scope]);

  const getVisitorCount = useCallback((summitId: string) => {
    const data = collectiveData.get(summitId);
    return data ? data.visitor_usernames.length : 0;
  }, [collectiveData]);

  // Color scheme based on number of visitors
  const getStyle = useCallback((summitId: string) => {
    const count = getVisitorCount(summitId);
    let color, weight, fillColor, fillOpacity;

    if (count === 0) {
      color = "#c4bfb6"; weight = 0.8; fillColor = "#e8e4df"; fillOpacity = 0.4;
    } else if (count === 1) {
      color = "#8c3a25"; weight = 1.5; fillColor = "#c75a3a"; fillOpacity = 0.75;
    } else if (count === 2) {
      color = "#9583ad"; weight = 1.15; fillColor = "#c5b3da"; fillOpacity = 0.65;
    } else {
      color = "#4a2878"; weight = 1.5; fillColor = "#7b52ab"; fillOpacity = 0.8;
    }

    return { color, weight, fillColor, fillOpacity };
  }, [getVisitorCount]);

  const geoStyle = useCallback(
    (f: any) => {
      const country = resolveCountryFromFeature(f as any);
      const summitId = country ? country.id : "";

      if (!summitId) {
        return { color: "#c4bfb6", weight: 0.8, fillColor: "#e8e4df", fillOpacity: 0.4 };
      }
      return getStyle(summitId);
    },
    [getStyle],
  );

  const onEachFeature = useCallback(
    (f: any, layer: L.Layer) => {
      const country = resolveCountryFromFeature(f as any);
      if (!country) return;
      const summitId = country.id;
      const name = country.name;

      layerRefs.current.set(summitId, layer as Path);
      const count = getVisitorCount(summitId);
      const tooltipText = count > 0
        ? `${name} — ${count} ${count === 1 ? 'visitante' : 'visitantes'}`
        : name;

      const statusClass = count >= 3 ? "tooltip-done" : count > 0 ? "tooltip-wishlist" : "tooltip-todo";
      layer.bindTooltip(tooltipText, {
        sticky: true,
        className: `summit-tooltip ${statusClass}`,
      });

      layer.on("click", () => {
        const data = collectiveData.get(summitId);
        if (data && data.visitor_usernames.length > 0) {
          const visitors = data.visitor_usernames.map((username, i) => ({
            id: data.visitor_ids[i],
            username,
            avatar: data.visitor_avatars[i],
          }));
          setSelectedSummit({ id: summitId, name, visitors });
        } else {
          setSelectedSummit({ id: summitId, name, visitors: [] });
        }
      });

      layer.on("mouseover", () => {
        if (searchedId === summitId) return;
        const style = getStyle(summitId);
        (layer as Path).setStyle({ weight: 2.5, fillOpacity: Math.min(style.fillOpacity + 0.15, 1) });
      });
      layer.on("mouseout", () => {
        if (searchedId === summitId) return;
        const style = getStyle(summitId);
        (layer as Path).setStyle({ weight: style.weight, fillOpacity: style.fillOpacity });
      });
    },
    [collectiveData, getVisitorCount, getStyle, searchedId],
  );

  const searchItems = useMemo<SearchItem[]>(() => {
    return countries.map((c) => {
      const count = getVisitorCount(c.id);
      const st = count >= 3 ? "done" : count > 0 ? "wishlist" : "none";
      
      let bounds: any;
      if (worldGeo) {
        const feature = worldGeo.features.find((f: any) => resolveCountryFromFeature(f)?.id === c.id);
        if (feature) {
          bounds = getLargestPolygonBounds(feature);
        }
      }
      
      return {
        id: c.id,
        name: c.name,
        status: st,
        type: "country",
        coordinates: c.coordinates,
        bounds,
      };
    });
  }, [getVisitorCount, worldGeo]);

  const handleSearchSelect = useCallback((item: SearchItem) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    
    setSearchedId(item.id);
    
    const layer = layerRefs.current.get(item.id);
    if (layer) {
      layer.bringToFront();
    }
    
    const data = collectiveData.get(item.id);
    if (data && data.visitor_usernames.length > 0) {
      const visitors = data.visitor_usernames.map((username, i) => ({
        id: data.visitor_ids[i],
        username,
        avatar: data.visitor_avatars[i],
      }));
      setSelectedSummit({ id: item.id, name: item.name, visitors });
    } else {
      setSelectedSummit({ id: item.id, name: item.name, visitors: [] });
    }



    searchTimeoutRef.current = setTimeout(() => {
      setSearchedId(null);
    }, 1800);
  }, [collectiveData, getStyle]);

  // Clean up timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    };
  }, []);

  // Total stats
  const totalVisited = collectiveData.size;
  const allVisitors = useMemo(() => {
    const set = new Set<string>();
    collectiveData.forEach((data) => {
      data.visitor_usernames.forEach((u) => set.add(u));
    });
    return set.size;
  }, [collectiveData]);

  return (
    <div className="collective-map-overlay">
      <div className="collective-map-header">
        <div className="collective-map-header-left">
          <h2>Mapa Colectivo</h2>
          <span className="collective-map-stats">
            {loading ? "Cargando..." : `${totalVisited} países · ${allVisitors} viajeros`}
          </span>
        </div>
        
        <div className="collective-map-toggles" style={{ marginLeft: 'auto', marginRight: '16px' }}>
          <div className="list-filters" style={{ margin: 0, display: "flex", gap: "6px" }}>
            <button
              className={`list-filter-pill ${scope === 'all' ? 'list-filter-pill--active' : ''}`}
              onClick={() => setScope('all')}
              style={scope === 'all' ? { background: '#7b52ab', color: 'white', borderColor: '#7b52ab', padding: "4px 12px", minWidth: "auto", fontSize: "0.8rem", height: "32px", alignItems: "center", justifyContent: "center" } : { padding: "4px 12px", minWidth: "auto", fontSize: "0.8rem", height: "32px", alignItems: "center", justifyContent: "center" }}
            >
              Global
            </button>
            <button
              className={`list-filter-pill ${scope === 'following' ? 'list-filter-pill--active' : ''}`}
              onClick={() => setScope('following')}
              style={scope === 'following' ? { background: '#7b52ab', color: 'white', borderColor: '#7b52ab', padding: "4px 12px", minWidth: "auto", fontSize: "0.8rem", height: "32px", alignItems: "center", justifyContent: "center" } : { padding: "4px 12px", minWidth: "auto", fontSize: "0.8rem", height: "32px", alignItems: "center", justifyContent: "center" }}
            >
              Siguiendo
            </button>
          </div>
        </div>

        <button className="collective-map-close" onClick={onClose} aria-label="Cerrar mapa colectivo">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="collective-map-container">
        {loading ? (
          <div className="collective-map-loading">
            <div className="collective-map-spinner" />
            <p>Cargando datos colectivos...</p>
          </div>
        ) : (
          <MapContainer
            key="map-countries"
            className="map"
            scrollWheelZoom={true}
            preferCanvas={true}
            minZoom={1}
            maxZoom={12}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={0.5}
          >
            <MapZoomListener />
            <SweepOverlay searchedId={searchedId} layerRefs={layerRefs} />
            <FitWorld />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              keepBuffer={40}
              updateWhenIdle={false}
              updateWhenZooming={true}
            />
            {worldGeo && (
              <GeoJSON
                key={`collective-geo-countries-${scope}`}
                data={worldGeo}
                style={geoStyle}
                onEachFeature={onEachFeature}
              />
            )}
            
            <MapSearchControl
              items={searchItems}
              onSelect={handleSearchSelect}
              placeholder="Buscar país..."
            />
          </MapContainer>
        )}

        {/* Legend */}
        <div className="collective-map-legend">
          <span>
            <i className="collective-legend-dot collective-legend-dot--3plus" /> 3+ visitantes
          </span>
          <span>
            <i className="collective-legend-dot collective-legend-dot--2" /> 2 visitantes
          </span>
          <span>
            <i className="collective-legend-dot collective-legend-dot--1" /> 1 visitante
          </span>
          <span>
            <i className="collective-legend-dot collective-legend-dot--none" /> Sin visitar
          </span>
        </div>

        {/* Visitor popup panel */}
        {selectedSummit && (
          <div className="collective-visitors-panel">
            <div className="collective-visitors-header">
              <h3>{selectedSummit.name}</h3>
              <button onClick={() => setSelectedSummit(null)} className="collective-visitors-close" aria-label="Cerrar panel">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {selectedSummit.visitors.length > 0 ? (
              <>
                <p className="collective-visitors-count">
                  {selectedSummit.visitors.length} {selectedSummit.visitors.length === 1 ? 'persona ha' : 'personas han'} visitado este lugar
                </p>
                <ul className="collective-visitors-list">
                  {selectedSummit.visitors.map((v) => (
                    <li key={v.id}>
                      <Link href={`/perfil/${v.username}?challenge=countries`} className="collective-visitor-link" onClick={(e) => e.stopPropagation()}>
                        <div className="collective-visitor-avatar">
                          {v.avatar ? (
                            <img src={v.avatar} alt={v.username} />
                          ) : (
                            v.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span>@{v.username}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="collective-visitors-empty">Nadie ha visitado este lugar todavía.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
