---
name: geodata-and-maps
description: >-
  Use this skill whenever working with geographical datasets, map visualization components (Leaflet, TopoJSON, GeoJSON), coordinates, mountain peaks, world countries, or administrative regions in the 47 Picos project.
---

# Geodata and Map Visualizations

This skill provides domain rules, procedures, and technical specifications for the cartographic systems in **47 Picos y 196 Países**.

---

## 1. Domain Entities & Geodata

### Spain: 52 High Points / 47 Physical Summits
The challenge encompasses all 50 provinces of Spain plus the Autonomous Cities of Ceuta and Melilla:
- Total demarcation count: **52**
- Total unique physical mountains: **47**
- **5 Shared Summits** (sitting precisely on provincial borders):
  1. **Gorbea** (1482.5m) — Álava (`01`) & Vizcaya (`48`)
  2. **Torre Cerredo** (2651.9m) — León (`24`) & Asturias (`33`)
  3. **Peñalara** (2428.4m) — Madrid (`28`) & Segovia (`40`)
  4. **Peña Trevinca** (2128.7m) — Orense (`32`) & Zamora (`49`)
  5. **Moncayo** (2314.3m) — Soria (`42`) & Zaragoza (`50`)

> [!IMPORTANT]
> Shared peaks share the **same string `id`** in `data/peaks.ts` and identical `coordinates` and `altitude`. Marking an ascent for one provincial entry will automatically cover the shared mountain in rankings and views when appropriate (see `008_fix_shared_peaks.sql`).

For the full list of 52 peaks, refer to [Peaks Reference Guide](./references/peaks-guide.md).

### World: 196 Countries & Sub-national Regions
- Data source: `data/countries.ts` (193 UN members + Palestine + Taiwan + Kosovo).
- **Kosovo identifier**: Uses `iso_n3: "-99"` to match Natural Earth / World-Atlas TopoJSON.
- Sub-national regions: `data/regions.ts` contains regional subdivisions (provinces, states, departments) keyed by country `iso_a2` (e.g. `AR`, `UY`, etc.).

---

## 2. Coordinate Conventions: GeoJSON vs. Leaflet

Be mindful of coordinate order inversion:
- **Leaflet**: Expects `[latitude, longitude]` (e.g., `[40.85, -3.95]`).
- **GeoJSON / TopoJSON**: Standard geometry format is `[longitude, latitude]` (e.g., `[-3.95, 40.85]`).

When transforming coordinates from GeoJSON features to Leaflet markers or bounds, reverse order:
```ts
const [lng, lat] = feature.geometry.coordinates;
const leafletLatLng: [number, number] = [lat, lng];
```

---

## 3. Map Components Architecture

All map components are located in `components/`:
- `spain-map.tsx`: Provincial boundaries choropleth + peak markers with color indicators:
  - Green / Gold: Ascended
  - Purple / Orange: In wishlist
  - Gray: Pending / Unascended
- `world-map.tsx`: World choropleth with countries and optional region drill-down.
- `collective-map.tsx`: Community aggregated visits.

### SSR Rules for Leaflet:
Leaflet accesses the browser `window` object at load time. Never import map components statically in Server Components:
```tsx
import dynamic from "next/dynamic";

const SpainMap = dynamic(() => import("@/components/spain-map"), { ssr: false });
```

---

## 4. Processing Boundary Geodata

To optimize or regenerate administrative region geometries:
- Script: `scripts/process-regions.mjs`
- Dependencies: `topojson-server`, `topojson-simplify`
- Command:
  ```bash
  node scripts/process-regions.mjs
  ```
- Output: GeoJSON / TopoJSON assets saved in `public/`.

---

## 5. Automated Data Validation

Verify the integrity of all geographic files by running:
```bash
npm test tests/unit/peaks.test.ts
npm test tests/unit/countries.test.ts
npm test tests/unit/regions.test.ts
```
