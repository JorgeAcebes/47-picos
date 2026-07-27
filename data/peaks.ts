export type Peak = {
  id: string;
  code: string;
  province: string;
  name: string;
  altitude: number;
  range: string;
  coordinates: [number, number];
  note: string;
};

// Coordenadas de referencia para situar los hitos en el mapa. Cinco cumbres
// son techo compartido entre dos provincias.
export const peaks: Peak[] = [
  { id: "alava", code: "01", province: "Álava", name: "Gorbeia", altitude: 1482, range: "Macizo de Gorbeia", coordinates: [43.03, -2.78], note: "Cumbre compartida con Bizkaia." },
  { id: "albacete", code: "02", province: "Albacete", name: "Pico de las Cabras", altitude: 2080, range: "Sierra de las Cabras", coordinates: [38.45, -2.43], note: "Techo de la provincia manchega." },
  { id: "alicante", code: "03", province: "Alicante", name: "Aitana", altitude: 1558, range: "Sierra de Aitana", coordinates: [38.66, -0.27], note: "La cima más alta de la provincia." },
  { id: "almeria", code: "04", province: "Almería", name: "Chullo", altitude: 2611, range: "Sierra Nevada", coordinates: [37.08, -2.84], note: "Cumbre limítrofe con Granada." },
  { id: "avila", code: "05", province: "Ávila", name: "Pico Almanzor", altitude: 2592, range: "Sierra de Gredos", coordinates: [40.24, -5.30], note: "El más alto del Sistema Central." },
  { id: "badajoz", code: "06", province: "Badajoz", name: "Tentudía", altitude: 1104, range: "Sierra de Tentudía", coordinates: [38.05, -6.34], note: "Mirador natural del sur de Extremadura." },
  { id: "illes-balears", code: "07", province: "Illes Balears", name: "Puig Major", altitude: 1436, range: "Serra de Tramuntana", coordinates: [39.81, 2.79], note: "Cima de acceso regulado por instalaciones militares." },
  { id: "barcelona", code: "08", province: "Barcelona", name: "Costa Cabirolera", altitude: 2605, range: "Serra del Cadí", coordinates: [42.30, 1.70], note: "Techo barcelonés en el Cadí-Moixeró." },
  { id: "burgos", code: "09", province: "Burgos", name: "San Millán", altitude: 2131, range: "Sierra de la Demanda", coordinates: [42.19, -3.14], note: "La cumbre más elevada de la Sierra de la Demanda." },
  { id: "caceres", code: "10", province: "Cáceres", name: "Torreón", altitude: 2401, range: "Sierra de Béjar", coordinates: [40.35, -5.66], note: "También conocido como Calvitero." },
  { id: "cadiz", code: "11", province: "Cádiz", name: "El Torreón", altitude: 1654, range: "Sierra del Pinar", coordinates: [36.77, -5.43], note: "Dentro del Parque Natural Sierra de Grazalema." },
  { id: "castellon", code: "12", province: "Castellón", name: "Penyagolosa", altitude: 1813, range: "Macizo del Penyagolosa", coordinates: [40.24, -0.35], note: "Una de las montañas más emblemáticas valencianas." },
  { id: "ciudad-real", code: "13", province: "Ciudad Real", name: "La Bañuela", altitude: 1332, range: "Sierra Madrona", coordinates: [38.49, -4.00], note: "El punto más alto de Sierra Madrona." },
  { id: "cordoba", code: "14", province: "Córdoba", name: "La Tiñosa", altitude: 1570, range: "Sierras Subbéticas", coordinates: [37.36, -4.28], note: "Techo de Córdoba, cerca de Priego." },
  { id: "coruna", code: "15", province: "A Coruña", name: "Pico de Cova da Serpe", altitude: 841, range: "Serra da Cova da Serpe", coordinates: [43.03, -7.90], note: "En el límite oriental de la provincia." },
  { id: "cuenca", code: "16", province: "Cuenca", name: "Mogorrita", altitude: 1864, range: "Serranía de Cuenca", coordinates: [40.27, -1.91], note: "Cerca del nacimiento del río Tajo." },
  { id: "girona", code: "17", province: "Girona", name: "Pica d'Estats", altitude: 3143, range: "Pirineos", coordinates: [42.67, 1.40], note: "Cumbre fronteriza con Francia." },
  { id: "granada", code: "18", province: "Granada", name: "Mulhacén", altitude: 3479, range: "Sierra Nevada", coordinates: [37.05, -3.31], note: "Techo de la península ibérica." },
  { id: "guadalajara", code: "19", province: "Guadalajara", name: "Pico del Lobo", altitude: 2274, range: "Sierra de Ayllón", coordinates: [41.17, -3.51], note: "Cima compartida con Segovia." },
  { id: "gipuzkoa", code: "20", province: "Gipuzkoa", name: "Aketegi", altitude: 1551, range: "Aizkorri", coordinates: [42.98, -2.31], note: "El punto más alto de Euskadi." },
  { id: "huelva", code: "21", province: "Huelva", name: "El Bonales", altitude: 1055, range: "Sierra de Aracena", coordinates: [38.00, -6.64], note: "Cumbre junto a la frontera portuguesa." },
  { id: "huesca", code: "22", province: "Huesca", name: "Aneto", altitude: 3404, range: "Macizo de la Maladeta", coordinates: [42.63, 0.66], note: "El techo de los Pirineos." },
  { id: "jaen", code: "23", province: "Jaén", name: "Mágina", altitude: 2167, range: "Sierra Mágina", coordinates: [37.74, -3.46], note: "Cima principal del parque natural homónimo." },
  { id: "leon", code: "24", province: "León", name: "Torre Cerredo", altitude: 2650, range: "Picos de Europa", coordinates: [43.20, -4.85], note: "Cumbre compartida con Asturias." },
  { id: "lleida", code: "25", province: "Lleida", name: "Pica d'Estats", altitude: 3143, range: "Pirineos", coordinates: [42.67, 1.40], note: "Cumbre compartida con Girona." },
  { id: "rioja", code: "26", province: "La Rioja", name: "San Lorenzo", altitude: 2271, range: "Sierra de la Demanda", coordinates: [42.24, -2.98], note: "Techo de La Rioja." },
  { id: "las-palmas", code: "35", province: "Las Palmas", name: "Morro de la Agujereada", altitude: 1956, range: "Gran Canaria", coordinates: [27.94, -15.58], note: "Punto más alto de Gran Canaria." },
  { id: "lugo", code: "27", province: "Lugo", name: "Pico Mustallar", altitude: 1935, range: "Ancares", coordinates: [42.80, -6.87], note: "En la sierra de Ancares." },
  { id: "madrid", code: "28", province: "Madrid", name: "Peñalara", altitude: 2428, range: "Sierra de Guadarrama", coordinates: [40.85, -3.95], note: "Cumbre compartida con Segovia." },
  { id: "malaga", code: "29", province: "Málaga", name: "La Maroma", altitude: 2066, range: "Sierra Tejeda", coordinates: [36.91, -4.08], note: "Techo de la provincia y de la Axarquía." },
  { id: "murcia", code: "30", province: "Murcia", name: "Los Obispos", altitude: 2015, range: "Sierra de Revolcadores", coordinates: [38.11, -2.42], note: "El techo de la Región de Murcia." },
  { id: "navarra", code: "31", province: "Navarra", name: "Hiru Erregeen Mahaia", altitude: 2446, range: "Pirineos", coordinates: [42.95, -0.73], note: "La Mesa de los Tres Reyes." },
  { id: "ourense", code: "32", province: "Ourense", name: "Peña Trevinca", altitude: 2127, range: "Macizo de Pena Trevinca", coordinates: [42.25, -6.88], note: "Cumbre compartida con Zamora." },
  { id: "asturias", code: "33", province: "Asturias", name: "Torre Cerredo", altitude: 2650, range: "Picos de Europa", coordinates: [43.20, -4.85], note: "Cumbre compartida con León." },
  { id: "palencia", code: "34", province: "Palencia", name: "Peña Prieta", altitude: 2539, range: "Fuentes Carrionas", coordinates: [43.04, -4.73], note: "Cima de la Cordillera Cantábrica." },
  { id: "pontevedra", code: "36", province: "Pontevedra", name: "O Faro", altitude: 1187, range: "Serra do Faro", coordinates: [42.60, -8.03], note: "El punto más alto de Pontevedra." },
  { id: "salamanca", code: "37", province: "Salamanca", name: "Canchal de la Ceja", altitude: 2428, range: "Sierra de Béjar", coordinates: [40.33, -5.68], note: "Cumbre del macizo de Gredos." },
  { id: "santa-cruz-tenerife", code: "38", province: "Santa Cruz de Tenerife", name: "Teide", altitude: 3718, range: "Tenerife", coordinates: [28.27, -16.64], note: "El punto más alto de España." },
  { id: "cantabria", code: "39", province: "Cantabria", name: "Torre Blanca", altitude: 2619, range: "Picos de Europa", coordinates: [43.09, -4.82], note: "Cumbre más alta de Cantabria." },
  { id: "segovia", code: "40", province: "Segovia", name: "Peñalara", altitude: 2428, range: "Sierra de Guadarrama", coordinates: [40.85, -3.95], note: "Cumbre compartida con Madrid." },
  { id: "sevilla", code: "41", province: "Sevilla", name: "El Terril", altitude: 1129, range: "Sierra del Tablón", coordinates: [36.95, -5.29], note: "El punto culminante de la provincia." },
  { id: "soria", code: "42", province: "Soria", name: "Moncayo", altitude: 2314, range: "Sistema Ibérico", coordinates: [41.79, -1.84], note: "Cumbre compartida con Zaragoza." },
  { id: "tarragona", code: "43", province: "Tarragona", name: "Tossal de la Baltasana", altitude: 1203, range: "Muntanyes de Prades", coordinates: [41.30, 1.03], note: "En la sierra de Prades." },
  { id: "teruel", code: "44", province: "Teruel", name: "Cerro Calderón", altitude: 1836, range: "Sierra de Javalambre", coordinates: [40.10, -1.43], note: "También llamado Alto de las Barracas." },
  { id: "toledo", code: "45", province: "Toledo", name: "Rocigalgo", altitude: 1448, range: "Montes de Toledo", coordinates: [39.45, -4.51], note: "Techo de los Montes de Toledo." },
  { id: "valencia", code: "46", province: "Valencia", name: "Alto de las Barracas", altitude: 1838, range: "Rincón de Ademuz", coordinates: [40.10, -1.43], note: "También conocido como Cerro Calderón." },
  { id: "valladolid", code: "47", province: "Valladolid", name: "Cerro de Cuchillejo", altitude: 933, range: "Montes Torozos", coordinates: [41.65, -4.86], note: "El punto más alto de Valladolid." },
  { id: "bizkaia", code: "48", province: "Bizkaia", name: "Gorbeia", altitude: 1482, range: "Macizo de Gorbeia", coordinates: [43.03, -2.78], note: "Cumbre compartida con Álava." },
  { id: "zamora", code: "49", province: "Zamora", name: "Peña Trevinca", altitude: 2127, range: "Macizo de Pena Trevinca", coordinates: [42.25, -6.88], note: "Cumbre compartida con Ourense." },
  { id: "zaragoza", code: "50", province: "Zaragoza", name: "Moncayo", altitude: 2314, range: "Sistema Ibérico", coordinates: [41.79, -1.84], note: "Cumbre compartida con Soria." },
  { id: "ceuta", code: "51", province: "Ceuta", name: "Monte Anyera", altitude: 349, range: "Sierra de Anyera", coordinates: [35.89, -5.33], note: "El punto más alto de la ciudad autónoma." },
  { id: "melilla", code: "52", province: "Melilla", name: "Fuerte de Rostrogordo", altitude: 135, range: "Meseta de Rostrogordo", coordinates: [35.31, -2.92], note: "Punto culminante de Melilla." },
];

export const peakByCode = Object.fromEntries(peaks.map((peak) => [peak.code, peak]));
