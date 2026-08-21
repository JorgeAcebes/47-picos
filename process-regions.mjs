import fs from 'fs/promises';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';

async function run() {
  console.log("Fetching GeoJSON...");
  const response = await fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson");
  const geojson = await response.json();

  console.log(`Loaded ${geojson.features.length} features`);

  // Filter features. Many features lack iso_a2, but they have `iso_a2` property in this dataset.
  const filteredFeatures = geojson.features.filter(f => f.properties.iso_a2 && f.properties.iso_a2 !== '-1');

  const cleanGeojson = {
    type: "FeatureCollection",
    features: filteredFeatures.map(f => {
      // Create a URL-safe id
      const nameSafe = f.properties.name ? f.properties.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : f.properties.iso_3166_2.toLowerCase();
      return {
        type: "Feature",
        properties: {
          id: `region-${f.properties.iso_a2.toLowerCase()}-${nameSafe}`,
          name: f.properties.name || f.properties.name_en || f.properties.name_alt || f.properties.iso_3166_2,
          iso_a2: f.properties.iso_a2.toUpperCase(),
        },
        geometry: f.geometry
      }
    })
  };

  console.log("Converting to TopoJSON...");
  let topo = topology({ regions: cleanGeojson });
  
  console.log("Simplifying TopoJSON...");
  topo = presimplify(topo);
  topo = simplify(topo, 0.005); 

  console.log("Writing public/world-regions.topo.json...");
  await fs.writeFile("./public/world-regions.topo.json", JSON.stringify(topo));

  // Extract regions for our data/regions.ts
  const regionsMap = {}; 
  for (const f of cleanGeojson.features) {
    const iso2 = f.properties.iso_a2;
    if (!regionsMap[iso2]) regionsMap[iso2] = [];
    
    // Evitar duplicados por nombre o ID
    const exists = regionsMap[iso2].find(r => r.id === f.properties.id || r.name === f.properties.name);
    if (!exists) {
      regionsMap[iso2].push({
        id: f.properties.id,
        name: f.properties.name
      });
    }
  }

  // Generate data/regions.ts
  let ts = `export type Region = { id: string; name: string; };\n\n`;
  ts += `export const regionsByCountryIsoA2: Record<string, Region[]> = {\n`;
  for (const [iso2, regions] of Object.entries(regionsMap)) {
    ts += `  "${iso2}": [\n`;
    regions.sort((a,b) => a.name.localeCompare(b.name));
    for (const r of regions) {
      ts += `    { id: "${r.id}", name: "${r.name.replace(/"/g, '\\"')}" },\n`;
    }
    ts += `  ],\n`;
  }
  ts += `};\n`;

  await fs.writeFile("./data/regions.ts", ts);
  console.log("Done!");
}

run().catch(console.error);
