export type Country = {
  id: string;        // "country-xx" — se usa como summit_id en Supabase
  iso_a2: string;    // ISO 3166-1 alpha-2 (para mostrar banderas, etc.)
  iso_n3: string;    // ISO 3166-1 numérico (para casar con GeoJSON de world-atlas)
  name: string;      // Nombre en castellano
  capital: string;
  coordinates?: [number, number];
  continent: string; // Continente en castellano
};

// ────────────────────────────────────────────────────────
//  193 estados miembros de la ONU + Palestina + Taiwán + Kosovo = 196
// ────────────────────────────────────────────────────────

export const countries: Country[] = [
  // ── ÁFRICA (54) ─────────────────────────────────────────
  { id: "country-dz", iso_a2: "DZ", iso_n3: "012", name: "Argelia", capital: "Argel", continent: "África", coordinates: [36.7323, 3.0875] },
  { id: "country-ao", iso_a2: "AO", iso_n3: "024", name: "Angola", capital: "Luanda", continent: "África", coordinates: [-8.8368, 13.2343] },
  { id: "country-bj", iso_a2: "BJ", iso_n3: "204", name: "Benín", capital: "Porto-Novo", continent: "África", coordinates: [6.4965, 2.6036] },
  { id: "country-bw", iso_a2: "BW", iso_n3: "072", name: "Botsuana", capital: "Gaborone", continent: "África", coordinates: [-24.6545, 25.9086] },
  { id: "country-bf", iso_a2: "BF", iso_n3: "854", name: "Burkina Faso", capital: "Uagadugú", continent: "África", coordinates: [12.3657, -1.5339] },
  { id: "country-bi", iso_a2: "BI", iso_n3: "108", name: "Burundi", capital: "Gitega", continent: "África", coordinates: [-3.4271, 29.9246] },
  { id: "country-cv", iso_a2: "CV", iso_n3: "132", name: "Cabo Verde", capital: "Praia", continent: "África", coordinates: [14.9315, -23.5125] },
  { id: "country-cm", iso_a2: "CM", iso_n3: "120", name: "Camerún", capital: "Yaundé", continent: "África", coordinates: [3.8667, 11.5167] },
  { id: "country-td", iso_a2: "TD", iso_n3: "148", name: "Chad", capital: "Yamena", continent: "África", coordinates: [12.1067, 15.0444] },
  { id: "country-km", iso_a2: "KM", iso_n3: "174", name: "Comoras", capital: "Moroni", continent: "África", coordinates: [-11.7022, 43.2551] },
  { id: "country-cg", iso_a2: "CG", iso_n3: "178", name: "República del Congo", capital: "Brazzaville", continent: "África", coordinates: [-4.2661, 15.2832] },
  { id: "country-cd", iso_a2: "CD", iso_n3: "180", name: "República Democrática del Congo", capital: "Kinsasa", continent: "África", coordinates: [-4.3276, 15.3136] },
  { id: "country-ci", iso_a2: "CI", iso_n3: "384", name: "Costa de Marfil", capital: "Yamusukro", continent: "África", coordinates: [6.8276, -5.2893] },
  { id: "country-dj", iso_a2: "DJ", iso_n3: "262", name: "Yibuti", capital: "Yibuti", continent: "África", coordinates: [11.5890, 43.1450] },
  { id: "country-eg", iso_a2: "EG", iso_n3: "818", name: "Egipto", capital: "El Cairo", continent: "África", coordinates: [30.0626, 31.2497] },
  { id: "country-gq", iso_a2: "GQ", iso_n3: "226", name: "Guinea Ecuatorial", capital: "Malabo", continent: "África", coordinates: [3.7558, 8.7817] },
  { id: "country-er", iso_a2: "ER", iso_n3: "232", name: "Eritrea", capital: "Asmara", continent: "África", coordinates: [15.3381, 38.9318] },
  { id: "country-sz", iso_a2: "SZ", iso_n3: "748", name: "Esuatini", capital: "Mbabane", continent: "África", coordinates: [-26.4667, 31.2000] },
  { id: "country-et", iso_a2: "ET", iso_n3: "231", name: "Etiopía", capital: "Adís Abeba", continent: "África", coordinates: [9.0250, 38.7469] },
  { id: "country-ga", iso_a2: "GA", iso_n3: "266", name: "Gabón", capital: "Libreville", continent: "África", coordinates: [0.3924, 9.4536] },
  { id: "country-gm", iso_a2: "GM", iso_n3: "270", name: "Gambia", capital: "Banjul", continent: "África", coordinates: [13.4527, -16.5780] },
  { id: "country-gh", iso_a2: "GH", iso_n3: "288", name: "Ghana", capital: "Acra", continent: "África", coordinates: [5.5560, -0.1969] },
  { id: "country-gn", iso_a2: "GN", iso_n3: "324", name: "Guinea", capital: "Conakri", continent: "África", coordinates: [9.5380, -13.6773] },
  { id: "country-gw", iso_a2: "GW", iso_n3: "624", name: "Guinea-Bisáu", capital: "Bisáu", continent: "África", coordinates: [11.8636, -15.5977] },
  { id: "country-ke", iso_a2: "KE", iso_n3: "404", name: "Kenia", capital: "Nairobi", continent: "África", coordinates: [-1.2833, 36.8167] },
  { id: "country-ls", iso_a2: "LS", iso_n3: "426", name: "Lesoto", capital: "Maseru", continent: "África", coordinates: [-29.3167, 27.4833] },
  { id: "country-lr", iso_a2: "LR", iso_n3: "430", name: "Liberia", capital: "Monrovia", continent: "África", coordinates: [6.3005, -10.7969] },
  { id: "country-ly", iso_a2: "LY", iso_n3: "434", name: "Libia", capital: "Trípoli", continent: "África", coordinates: [32.8874, 13.1873] },
  { id: "country-mg", iso_a2: "MG", iso_n3: "450", name: "Madagascar", capital: "Antananarivo", continent: "África", coordinates: [-18.9137, 47.5361] },
  { id: "country-mw", iso_a2: "MW", iso_n3: "454", name: "Malaui", capital: "Lilongüe", continent: "África", coordinates: [-13.9669, 33.7873] },
  { id: "country-ml", iso_a2: "ML", iso_n3: "466", name: "Malí", capital: "Bamako", continent: "África", coordinates: [12.6091, -7.9752] },
  { id: "country-mr", iso_a2: "MR", iso_n3: "478", name: "Mauritania", capital: "Nuakchot", continent: "África", coordinates: [18.0858, -15.9785] },
  { id: "country-mu", iso_a2: "MU", iso_n3: "480", name: "Mauricio", capital: "Port Louis", continent: "África", coordinates: [-20.1619, 57.4989] },
  { id: "country-ma", iso_a2: "MA", iso_n3: "504", name: "Marruecos", capital: "Rabat", continent: "África", coordinates: [34.0132, -6.8326] },
  { id: "country-mz", iso_a2: "MZ", iso_n3: "508", name: "Mozambique", capital: "Maputo", continent: "África", coordinates: [-25.9655, 32.5832] },
  { id: "country-na", iso_a2: "NA", iso_n3: "516", name: "Namibia", capital: "Windhoek", continent: "África", coordinates: [-22.5594, 17.0832] },
  { id: "country-ne", iso_a2: "NE", iso_n3: "562", name: "Níger", capital: "Niamey", continent: "África", coordinates: [13.5137, 2.1098] },
  { id: "country-ng", iso_a2: "NG", iso_n3: "566", name: "Nigeria", capital: "Abuya", continent: "África", coordinates: [9.0579, 7.4951] },
  { id: "country-cf", iso_a2: "CF", iso_n3: "140", name: "República Centroafricana", capital: "Bangui", continent: "África", coordinates: [4.3612, 18.5550] },
  { id: "country-rw", iso_a2: "RW", iso_n3: "646", name: "Ruanda", capital: "Kigali", continent: "África", coordinates: [-1.9500, 30.0588] },
  { id: "country-st", iso_a2: "ST", iso_n3: "678", name: "Santo Tomé y Príncipe", capital: "Santo Tomé", continent: "África", coordinates: [0.3376, 6.7299] },
  { id: "country-sn", iso_a2: "SN", iso_n3: "686", name: "Senegal", capital: "Dakar", continent: "África", coordinates: [14.6937, -17.4441] },
  { id: "country-sc", iso_a2: "SC", iso_n3: "690", name: "Seychelles", capital: "Victoria", continent: "África", coordinates: [-4.6200, 55.4550] },
  { id: "country-sl", iso_a2: "SL", iso_n3: "694", name: "Sierra Leona", capital: "Freetown", continent: "África", coordinates: [8.4871, -13.2356] },
  { id: "country-so", iso_a2: "SO", iso_n3: "706", name: "Somalia", capital: "Mogadiscio", continent: "África", coordinates: [2.0371, 45.3438] },
  { id: "country-za", iso_a2: "ZA", iso_n3: "710", name: "Sudáfrica", capital: "Pretoria", continent: "África", coordinates: [-25.7449, 28.1878] },
  { id: "country-ss", iso_a2: "SS", iso_n3: "728", name: "Sudán del Sur", capital: "Yuba", continent: "África", coordinates: [4.8517, 31.5825] },
  { id: "country-sd", iso_a2: "SD", iso_n3: "729", name: "Sudán", capital: "Jartum", continent: "África", coordinates: [15.5518, 32.5324] },
  { id: "country-tz", iso_a2: "TZ", iso_n3: "834", name: "Tanzania", capital: "Dodoma", continent: "África", coordinates: [-6.1722, 35.7395] },
  { id: "country-tg", iso_a2: "TG", iso_n3: "768", name: "Togo", capital: "Lomé", continent: "África", coordinates: [6.1287, 1.2215] },
  { id: "country-tn", iso_a2: "TN", iso_n3: "788", name: "Túnez", capital: "Túnez", continent: "África", coordinates: [36.8190, 10.1658] },
  { id: "country-ug", iso_a2: "UG", iso_n3: "800", name: "Uganda", capital: "Kampala", continent: "África", coordinates: [0.3163, 32.5822] },
  { id: "country-zm", iso_a2: "ZM", iso_n3: "894", name: "Zambia", capital: "Lusaka", continent: "África", coordinates: [-15.4067, 28.2871] },
  { id: "country-zw", iso_a2: "ZW", iso_n3: "716", name: "Zimbabue", capital: "Harare", continent: "África", coordinates: [-17.8277, 31.0534] },

  // ── AMÉRICA (35) ────────────────────────────────────────
  { id: "country-ag", iso_a2: "AG", iso_n3: "028", name: "Antigua y Barbuda", capital: "Saint John", continent: "América", coordinates: [45.2708, -66.0562] },
  { id: "country-ar", iso_a2: "AR", iso_n3: "032", name: "Argentina", capital: "Buenos Aires", continent: "América", coordinates: [-34.6131, -58.3772] },
  { id: "country-bs", iso_a2: "BS", iso_n3: "044", name: "Bahamas", capital: "Nasáu", continent: "América", coordinates: [25.0582, -77.3431] },
  { id: "country-bb", iso_a2: "BB", iso_n3: "052", name: "Barbados", capital: "Bridgetown", continent: "América", coordinates: [13.1073, -59.6202] },
  { id: "country-bz", iso_a2: "BZ", iso_n3: "084", name: "Belice", capital: "Belmopán", continent: "América", coordinates: [17.2538, -88.7640] },
  { id: "country-bo", iso_a2: "BO", iso_n3: "068", name: "Bolivia", capital: "Sucre", continent: "América", coordinates: [-19.0333, -65.2627] },
  { id: "country-br", iso_a2: "BR", iso_n3: "076", name: "Brasil", capital: "Brasilia", continent: "América", coordinates: [-15.7797, -47.9297] },
  { id: "country-ca", iso_a2: "CA", iso_n3: "124", name: "Canadá", capital: "Ottawa", continent: "América", coordinates: [45.4112, -75.6981] },
  { id: "country-cl", iso_a2: "CL", iso_n3: "152", name: "Chile", capital: "Santiago de Chile", continent: "América", coordinates: [-33.4569, -70.6483] },
  { id: "country-co", iso_a2: "CO", iso_n3: "170", name: "Colombia", capital: "Bogotá", continent: "América", coordinates: [4.6097, -74.0817] },
  { id: "country-cr", iso_a2: "CR", iso_n3: "188", name: "Costa Rica", capital: "San José", continent: "América", coordinates: [10.9519, -85.1357] },
  { id: "country-cu", iso_a2: "CU", iso_n3: "192", name: "Cuba", capital: "La Habana", continent: "América", coordinates: [23.1330, -82.3830] },
  { id: "country-dm", iso_a2: "DM", iso_n3: "212", name: "Dominica", capital: "Roseau", continent: "América", coordinates: [15.3017, -61.3881] },
  { id: "country-do", iso_a2: "DO", iso_n3: "214", name: "República Dominicana", capital: "Santo Domingo", continent: "América", coordinates: [18.4719, -69.8923] },
  { id: "country-ec", iso_a2: "EC", iso_n3: "218", name: "Ecuador", capital: "Quito", continent: "América", coordinates: [-0.2298, -78.5250] },
  { id: "country-sv", iso_a2: "SV", iso_n3: "222", name: "El Salvador", capital: "San Salvador", continent: "América", coordinates: [13.6893, -89.1872] },
  { id: "country-gd", iso_a2: "GD", iso_n3: "308", name: "Granada", capital: "Saint George", continent: "América", coordinates: [48.4285, -58.4815] },
  { id: "country-gt", iso_a2: "GT", iso_n3: "320", name: "Guatemala", capital: "Ciudad de Guatemala", continent: "América", coordinates: [14.6407, -90.5133] },
  { id: "country-gy", iso_a2: "GY", iso_n3: "328", name: "Guyana", capital: "Georgetown", continent: "América", coordinates: [6.8045, -58.1553] },
  { id: "country-ht", iso_a2: "HT", iso_n3: "332", name: "Haití", capital: "Puerto Príncipe", continent: "América", coordinates: [18.5435, -72.3388] },
  { id: "country-hn", iso_a2: "HN", iso_n3: "340", name: "Honduras", capital: "Tegucigalpa", continent: "América", coordinates: [14.0818, -87.2068] },
  { id: "country-jm", iso_a2: "JM", iso_n3: "388", name: "Jamaica", capital: "Kingston", continent: "América", coordinates: [17.9970, -76.7936] },
  { id: "country-mx", iso_a2: "MX", iso_n3: "484", name: "México", capital: "Ciudad de México", continent: "América", coordinates: [19.4285, -99.1277] },
  { id: "country-ni", iso_a2: "NI", iso_n3: "558", name: "Nicaragua", capital: "Managua", continent: "América", coordinates: [12.1328, -86.2504] },
  { id: "country-pa", iso_a2: "PA", iso_n3: "591", name: "Panamá", capital: "Ciudad de Panamá", continent: "América", coordinates: [8.9936, -79.5197] },
  { id: "country-py", iso_a2: "PY", iso_n3: "600", name: "Paraguay", capital: "Asunción", continent: "América", coordinates: [-25.2865, -57.6470] },
  { id: "country-pe", iso_a2: "PE", iso_n3: "604", name: "Perú", capital: "Lima", continent: "América", coordinates: [-12.0432, -77.0282] },
  { id: "country-kn", iso_a2: "KN", iso_n3: "659", name: "San Cristóbal y Nieves", capital: "Basseterre", continent: "América", coordinates: [17.2955, -62.7250] },
  { id: "country-lc", iso_a2: "LC", iso_n3: "662", name: "Santa Lucía", capital: "Castries", continent: "América", coordinates: [13.9957, -61.0061] },
  { id: "country-vc", iso_a2: "VC", iso_n3: "670", name: "San Vicente y las Granadinas", capital: "Kingstown", continent: "América", coordinates: [13.1553, -61.2274] },
  { id: "country-sr", iso_a2: "SR", iso_n3: "740", name: "Surinam", capital: "Paramaribo", continent: "América", coordinates: [5.8664, -55.1668] },
  { id: "country-tt", iso_a2: "TT", iso_n3: "780", name: "Trinidad y Tobago", capital: "Puerto España", continent: "América", coordinates: [10.6667, -61.5189] },
  { id: "country-us", iso_a2: "US", iso_n3: "840", name: "Estados Unidos", capital: "Washington D.C.", continent: "América", coordinates: [38.8951, -77.0364] },
  { id: "country-uy", iso_a2: "UY", iso_n3: "858", name: "Uruguay", capital: "Montevideo", continent: "América", coordinates: [-34.9033, -56.1882] },
  { id: "country-ve", iso_a2: "VE", iso_n3: "862", name: "Venezuela", capital: "Caracas", continent: "América", coordinates: [10.4880, -66.8792] },

  // ── ASIA (47 + Palestina + Taiwán = 49) ─────────────────
  { id: "country-af", iso_a2: "AF", iso_n3: "004", name: "Afganistán", capital: "Kabul", continent: "Asia", coordinates: [34.5281, 69.1723] },
  { id: "country-am", iso_a2: "AM", iso_n3: "051", name: "Armenia", capital: "Ereván", continent: "Asia", coordinates: [40.1776, 44.5126] },
  { id: "country-az", iso_a2: "AZ", iso_n3: "031", name: "Azerbaiyán", capital: "Bakú", continent: "Asia", coordinates: [40.3777, 49.8920] },
  { id: "country-bh", iso_a2: "BH", iso_n3: "048", name: "Baréin", capital: "Manama", continent: "Asia", coordinates: [26.2279, 50.5857] },
  { id: "country-bd", iso_a2: "BD", iso_n3: "050", name: "Bangladés", capital: "Daca", continent: "Asia", coordinates: [23.7104, 90.4074] },
  { id: "country-bt", iso_a2: "BT", iso_n3: "064", name: "Bután", capital: "Timbu", continent: "Asia", coordinates: [27.4661, 89.6419] },
  { id: "country-bn", iso_a2: "BN", iso_n3: "096", name: "Brunéi", capital: "Bandar Seri Begawan", continent: "Asia", coordinates: [4.8903, 114.9401] },
  { id: "country-kh", iso_a2: "KH", iso_n3: "116", name: "Camboya", capital: "Nom Pen", continent: "Asia", coordinates: [11.5625, 104.9160] },
  { id: "country-cn", iso_a2: "CN", iso_n3: "156", name: "China", capital: "Pekín", continent: "Asia", coordinates: [39.9075, 116.3972] },
  { id: "country-cy", iso_a2: "CY", iso_n3: "196", name: "Chipre", capital: "Nicosia", continent: "Asia", coordinates: [35.1728, 33.3540] },
  { id: "country-kp", iso_a2: "KP", iso_n3: "408", name: "Corea del Norte", capital: "Pionyang", continent: "Asia", coordinates: [39.0339, 125.7543] },
  { id: "country-kr", iso_a2: "KR", iso_n3: "410", name: "Corea del Sur", capital: "Seúl", continent: "Asia", coordinates: [37.5660, 126.9784] },
  { id: "country-ae", iso_a2: "AE", iso_n3: "784", name: "Emiratos Árabes Unidos", capital: "Abu Dabi", continent: "Asia", coordinates: [24.4512, 54.3970] },
  { id: "country-ph", iso_a2: "PH", iso_n3: "608", name: "Filipinas", capital: "Manila", continent: "Asia", coordinates: [14.6042, 120.9822] },
  { id: "country-ge", iso_a2: "GE", iso_n3: "268", name: "Georgia", capital: "Tiflis", continent: "Asia", coordinates: [41.6914, 44.8341] },
  { id: "country-in", iso_a2: "IN", iso_n3: "356", name: "India", capital: "Nueva Delhi", continent: "Asia", coordinates: [28.6214, 77.2148] },
  { id: "country-id", iso_a2: "ID", iso_n3: "360", name: "Indonesia", capital: "Yakarta", continent: "Asia", coordinates: [-6.2146, 106.8451] },
  { id: "country-iq", iso_a2: "IQ", iso_n3: "368", name: "Irak", capital: "Bagdad", continent: "Asia", coordinates: [33.3406, 44.4009] },
  { id: "country-ir", iso_a2: "IR", iso_n3: "364", name: "Irán", capital: "Teherán", continent: "Asia", coordinates: [35.6944, 51.4215] },
  { id: "country-il", iso_a2: "IL", iso_n3: "376", name: "Israel", capital: "Jerusalén", continent: "Asia", coordinates: [31.7690, 35.2163] },
  { id: "country-jp", iso_a2: "JP", iso_n3: "392", name: "Japón", capital: "Tokio", continent: "Asia", coordinates: [35.6895, 139.6917] },
  { id: "country-jo", iso_a2: "JO", iso_n3: "400", name: "Jordania", capital: "Amán", continent: "Asia", coordinates: [31.9552, 35.9450] },
  { id: "country-kz", iso_a2: "KZ", iso_n3: "398", name: "Kazajistán", capital: "Astaná", continent: "Asia", coordinates: [51.1801, 71.4460] },
  { id: "country-kg", iso_a2: "KG", iso_n3: "417", name: "Kirguistán", capital: "Biskek", continent: "Asia", coordinates: [42.8700, 74.5900] },
  { id: "country-kw", iso_a2: "KW", iso_n3: "414", name: "Kuwait", capital: "Kuwait", continent: "Asia", coordinates: [29.3670, 47.9743] },
  { id: "country-la", iso_a2: "LA", iso_n3: "418", name: "Laos", capital: "Vientián", continent: "Asia", coordinates: [17.9667, 102.6000] },
  { id: "country-lb", iso_a2: "LB", iso_n3: "422", name: "Líbano", capital: "Beirut", continent: "Asia", coordinates: [33.8933, 35.5016] },
  { id: "country-my", iso_a2: "MY", iso_n3: "458", name: "Malasia", capital: "Kuala Lumpur", continent: "Asia", coordinates: [3.1412, 101.6865] },
  { id: "country-mv", iso_a2: "MV", iso_n3: "462", name: "Maldivas", capital: "Malé", continent: "Asia", coordinates: [4.1755, 73.5093] },
  { id: "country-mn", iso_a2: "MN", iso_n3: "496", name: "Mongolia", capital: "Ulán Bator", continent: "Asia", coordinates: [47.9077, 106.8832] },
  { id: "country-mm", iso_a2: "MM", iso_n3: "104", name: "Myanmar", capital: "Naipyidó", continent: "Asia", coordinates: [19.7633, 96.0785] },
  { id: "country-np", iso_a2: "NP", iso_n3: "524", name: "Nepal", capital: "Katmandú", continent: "Asia", coordinates: [27.7017, 85.3206] },
  { id: "country-om", iso_a2: "OM", iso_n3: "512", name: "Omán", capital: "Mascate", continent: "Asia", coordinates: [23.5841, 58.4078] },
  { id: "country-pk", iso_a2: "PK", iso_n3: "586", name: "Pakistán", capital: "Islamabad", continent: "Asia", coordinates: [33.7215, 73.0433] },
  { id: "country-ps", iso_a2: "PS", iso_n3: "275", name: "Palestina", capital: "Ramala", continent: "Asia", coordinates: [31.9025, 35.2034] },
  { id: "country-qa", iso_a2: "QA", iso_n3: "634", name: "Catar", capital: "Doha", continent: "Asia", coordinates: [25.2855, 51.5310] },
  { id: "country-sa", iso_a2: "SA", iso_n3: "682", name: "Arabia Saudita", capital: "Riad", continent: "Asia", coordinates: [24.6877, 46.7219] },
  { id: "country-sg", iso_a2: "SG", iso_n3: "702", name: "Singapur", capital: "Singapur", continent: "Asia", coordinates: [1.2897, 103.8501] },
  { id: "country-sy", iso_a2: "SY", iso_n3: "760", name: "Siria", capital: "Damasco", continent: "Asia", coordinates: [33.5102, 36.2913] },
  { id: "country-lk", iso_a2: "LK", iso_n3: "144", name: "Sri Lanka", capital: "Sri Jayawardenapura Kotte", continent: "Asia", coordinates: [6.9355, 79.8487] },
  { id: "country-tj", iso_a2: "TJ", iso_n3: "762", name: "Tayikistán", capital: "Dusambé", continent: "Asia", coordinates: [38.5358, 68.7790] },
  { id: "country-th", iso_a2: "TH", iso_n3: "764", name: "Tailandia", capital: "Bangkok", continent: "Asia", coordinates: [13.7540, 100.5014] },
  { id: "country-tl", iso_a2: "TL", iso_n3: "626", name: "Timor Oriental", capital: "Dili", continent: "Asia", coordinates: [-8.5586, 125.5736] },
  { id: "country-tm", iso_a2: "TM", iso_n3: "795", name: "Turkmenistán", capital: "Asjabad", continent: "Asia", coordinates: [37.9500, 58.3833] },
  { id: "country-tr", iso_a2: "TR", iso_n3: "792", name: "Turquía", capital: "Ankara", continent: "Asia", coordinates: [39.9199, 32.8543] },
  { id: "country-uz", iso_a2: "UZ", iso_n3: "860", name: "Uzbekistán", capital: "Taskent", continent: "Asia", coordinates: [41.2647, 69.2163] },
  { id: "country-vn", iso_a2: "VN", iso_n3: "704", name: "Vietnam", capital: "Hanói", continent: "Asia", coordinates: [21.0245, 105.8412] },
  { id: "country-ye", iso_a2: "YE", iso_n3: "887", name: "Yemen", capital: "Saná", continent: "Asia", coordinates: [15.3694, 44.1910] },
  { id: "country-tw", iso_a2: "TW", iso_n3: "158", name: "Taiwán", capital: "Taipéi", continent: "Asia", coordinates: [25.0330, 121.5654] },

  // ── EUROPA (43 + Kosovo = 44) ───────────────────────────
  { id: "country-al", iso_a2: "AL", iso_n3: "008", name: "Albania", capital: "Tirana", continent: "Europa", coordinates: [41.3274, 19.8187] },
  { id: "country-ad", iso_a2: "AD", iso_n3: "020", name: "Andorra", capital: "Andorra la Vieja", continent: "Europa", coordinates: [42.5078, 1.5211] },
  { id: "country-at", iso_a2: "AT", iso_n3: "040", name: "Austria", capital: "Viena", continent: "Europa", coordinates: [48.2085, 16.3721] },
  { id: "country-by", iso_a2: "BY", iso_n3: "112", name: "Bielorrusia", capital: "Minsk", continent: "Europa", coordinates: [53.9002, 27.5665] },
  { id: "country-be", iso_a2: "BE", iso_n3: "056", name: "Bélgica", capital: "Bruselas", continent: "Europa", coordinates: [50.8505, 4.3488] },
  { id: "country-ba", iso_a2: "BA", iso_n3: "070", name: "Bosnia y Herzegovina", capital: "Sarajevo", continent: "Europa", coordinates: [43.8486, 18.3564] },
  { id: "country-bg", iso_a2: "BG", iso_n3: "100", name: "Bulgaria", capital: "Sofía", continent: "Europa", coordinates: [42.6975, 23.3241] },
  { id: "country-hr", iso_a2: "HR", iso_n3: "191", name: "Croacia", capital: "Zagreb", continent: "Europa", coordinates: [45.8144, 15.9780] },
  { id: "country-cz", iso_a2: "CZ", iso_n3: "203", name: "Chequia", capital: "Praga", continent: "Europa", coordinates: [50.0755, 14.4378] },
  { id: "country-dk", iso_a2: "DK", iso_n3: "208", name: "Dinamarca", capital: "Copenhague", continent: "Europa", coordinates: [55.6759, 12.5655] },
  { id: "country-sk", iso_a2: "SK", iso_n3: "703", name: "Eslovaquia", capital: "Bratislava", continent: "Europa", coordinates: [48.1482, 17.1067] },
  { id: "country-si", iso_a2: "SI", iso_n3: "705", name: "Eslovenia", capital: "Liubliana", continent: "Europa", coordinates: [46.0511, 14.5051] },
  { id: "country-es", iso_a2: "ES", iso_n3: "724", name: "España", capital: "Madrid", continent: "Europa", coordinates: [40.4165, -3.7026] },
  { id: "country-ee", iso_a2: "EE", iso_n3: "233", name: "Estonia", capital: "Tallin", continent: "Europa", coordinates: [59.4370, 24.7535] },
  { id: "country-fi", iso_a2: "FI", iso_n3: "246", name: "Finlandia", capital: "Helsinki", continent: "Europa", coordinates: [60.1695, 24.9354] },
  { id: "country-fr", iso_a2: "FR", iso_n3: "250", name: "Francia", capital: "París", continent: "Europa", coordinates: [48.8534, 2.3488] },
  { id: "country-de", iso_a2: "DE", iso_n3: "276", name: "Alemania", capital: "Berlín", continent: "Europa", coordinates: [52.5244, 13.4105] },
  { id: "country-gr", iso_a2: "GR", iso_n3: "300", name: "Grecia", capital: "Atenas", continent: "Europa", coordinates: [37.9838, 23.7278] },
  { id: "country-hu", iso_a2: "HU", iso_n3: "348", name: "Hungría", capital: "Budapest", continent: "Europa", coordinates: [47.4984, 19.0404] },
  { id: "country-is", iso_a2: "IS", iso_n3: "352", name: "Islandia", capital: "Reikiavik", continent: "Europa", coordinates: [64.1466, -21.9426] },
  { id: "country-ie", iso_a2: "IE", iso_n3: "372", name: "Irlanda", capital: "Dublín", continent: "Europa", coordinates: [53.3331, -6.2489] },
  { id: "country-it", iso_a2: "IT", iso_n3: "380", name: "Italia", capital: "Roma", continent: "Europa", coordinates: [41.8919, 12.5113] },
  { id: "country-xk", iso_a2: "XK", iso_n3: "-99", name: "Kosovo", capital: "Pristina", continent: "Europa", coordinates: [42.6666, 21.1666] },
  { id: "country-lv", iso_a2: "LV", iso_n3: "428", name: "Letonia", capital: "Riga", continent: "Europa", coordinates: [56.9460, 24.1059] },
  { id: "country-li", iso_a2: "LI", iso_n3: "438", name: "Liechtenstein", capital: "Vaduz", continent: "Europa", coordinates: [47.1415, 9.5215] },
  { id: "country-lt", iso_a2: "LT", iso_n3: "440", name: "Lituania", capital: "Vilna", continent: "Europa", coordinates: [54.6892, 25.2798] },
  { id: "country-lu", iso_a2: "LU", iso_n3: "442", name: "Luxemburgo", capital: "Luxemburgo", continent: "Europa", coordinates: [49.6098, 6.1327] },
  { id: "country-mt", iso_a2: "MT", iso_n3: "470", name: "Malta", capital: "La Valeta", continent: "Europa", coordinates: [35.8997, 14.5148] },
  { id: "country-md", iso_a2: "MD", iso_n3: "498", name: "Moldavia", capital: "Chisináu", continent: "Europa", coordinates: [47.0105, 28.8638] },
  { id: "country-mc", iso_a2: "MC", iso_n3: "492", name: "Mónaco", capital: "Mónaco", continent: "Europa", coordinates: [43.7372, 7.4215] },
  { id: "country-me", iso_a2: "ME", iso_n3: "499", name: "Montenegro", capital: "Podgorica", continent: "Europa", coordinates: [42.4412, 19.2631] },
  { id: "country-nl", iso_a2: "NL", iso_n3: "528", name: "Países Bajos", capital: "Ámsterdam", continent: "Europa", coordinates: [52.3740, 4.8897] },
  { id: "country-mk", iso_a2: "MK", iso_n3: "807", name: "Macedonia del Norte", capital: "Skopie", continent: "Europa", coordinates: [41.9965, 21.4314] },
  { id: "country-no", iso_a2: "NO", iso_n3: "578", name: "Noruega", capital: "Oslo", continent: "Europa", coordinates: [59.9127, 10.7461] },
  { id: "country-pl", iso_a2: "PL", iso_n3: "616", name: "Polonia", capital: "Varsovia", continent: "Europa", coordinates: [52.2298, 21.0118] },
  { id: "country-pt", iso_a2: "PT", iso_n3: "620", name: "Portugal", capital: "Lisboa", continent: "Europa", coordinates: [38.7251, -9.1498] },
  { id: "country-gb", iso_a2: "GB", iso_n3: "826", name: "Reino Unido", capital: "Londres", continent: "Europa", coordinates: [51.5085, -0.1257] },
  { id: "country-ro", iso_a2: "RO", iso_n3: "642", name: "Rumanía", capital: "Bucarest", continent: "Europa", coordinates: [44.4323, 26.1063] },
  { id: "country-ru", iso_a2: "RU", iso_n3: "643", name: "Rusia", capital: "Moscú", continent: "Europa", coordinates: [55.7520, 37.6178] },
  { id: "country-sm", iso_a2: "SM", iso_n3: "674", name: "San Marino", capital: "San Marino", continent: "Europa", coordinates: [44.8074, 10.9144] },
  { id: "country-rs", iso_a2: "RS", iso_n3: "688", name: "Serbia", capital: "Belgrado", continent: "Europa", coordinates: [44.8040, 20.4651] },
  { id: "country-se", iso_a2: "SE", iso_n3: "752", name: "Suecia", capital: "Estocolmo", continent: "Europa", coordinates: [59.3294, 18.0687] },
  { id: "country-ch", iso_a2: "CH", iso_n3: "756", name: "Suiza", capital: "Berna", continent: "Europa", coordinates: [46.9481, 7.4474] },
  { id: "country-ua", iso_a2: "UA", iso_n3: "804", name: "Ucrania", capital: "Kiev", continent: "Europa", coordinates: [50.4547, 30.5238] },

  // ── OCEANÍA (14) ────────────────────────────────────────
  { id: "country-au", iso_a2: "AU", iso_n3: "036", name: "Australia", capital: "Canberra", continent: "Oceanía", coordinates: [-35.2835, 149.1281] },
  { id: "country-fj", iso_a2: "FJ", iso_n3: "242", name: "Fiyi", capital: "Suva", continent: "Oceanía", coordinates: [-18.1368, 178.4253] },
  { id: "country-ki", iso_a2: "KI", iso_n3: "296", name: "Kiribati", capital: "Tarawa Sur", continent: "Oceanía", coordinates: [1.3260, 172.9815] },
  { id: "country-mh", iso_a2: "MH", iso_n3: "584", name: "Islas Marshall", capital: "Majuro", continent: "Oceanía", coordinates: [7.0897, 171.3803] },
  { id: "country-fm", iso_a2: "FM", iso_n3: "583", name: "Micronesia", capital: "Palikir", continent: "Oceanía", coordinates: [6.9248, 158.1611] },
  { id: "country-nr", iso_a2: "NR", iso_n3: "520", name: "Nauru", capital: "Yaren", continent: "Oceanía", coordinates: [-0.5508, 166.9252] },
  { id: "country-nz", iso_a2: "NZ", iso_n3: "554", name: "Nueva Zelanda", capital: "Wellington", continent: "Oceanía", coordinates: [-41.2866, 174.7756] },
  { id: "country-pw", iso_a2: "PW", iso_n3: "585", name: "Palaos", capital: "Ngerulmud", continent: "Oceanía", coordinates: [7.5008, 134.6238] },
  { id: "country-pg", iso_a2: "PG", iso_n3: "598", name: "Papúa Nueva Guinea", capital: "Port Moresby", continent: "Oceanía", coordinates: [-9.4772, 147.1509] },
  { id: "country-ws", iso_a2: "WS", iso_n3: "882", name: "Samoa", capital: "Apia", continent: "Oceanía", coordinates: [-13.8333, -171.7667] },
  { id: "country-sb", iso_a2: "SB", iso_n3: "090", name: "Islas Salomón", capital: "Honiara", continent: "Oceanía", coordinates: [-9.4333, 159.9500] },
  { id: "country-to", iso_a2: "TO", iso_n3: "776", name: "Tonga", capital: "Nukualofa", continent: "Oceanía", coordinates: [-21.1394, -175.2018] },
  { id: "country-tv", iso_a2: "TV", iso_n3: "798", name: "Tuvalu", capital: "Funafuti", continent: "Oceanía", coordinates: [-8.5243, 179.1942] },
  { id: "country-vu", iso_a2: "VU", iso_n3: "548", name: "Vanuatu", capital: "Port Vila", continent: "Oceanía", coordinates: [-17.7333, 168.3219] },
];

// Índice por ISO numérico (para casar con el GeoJSON del world-atlas)
export const countryByN3: Record<string, Country> = Object.fromEntries(
  countries.map((c) => [c.iso_n3, c]),
);

// Índice por id (para Supabase summit_id)
export const countryById: Record<string, Country> = Object.fromEntries(
  countries.map((c) => [c.id, c]),
);

// Índice por nombre (fallback para features sin iso_n3, como Kosovo)
export const countryByName: Record<string, Country> = Object.fromEntries(
  countries.map((c) => {
    // Map GeoJSON names to our data (some names differ)
    const aliases: [string, string][] = [
      ["Dem. Rep. Congo", "country-cd"],
      ["Central African Rep.", "country-cf"],
      ["Eq. Guinea", "country-gq"],
      ["eSwatini", "country-sz"],
      ["S. Sudan", "country-ss"],
      ["Côte d'Ivoire", "country-ci"],
      ["Dominican Rep.", "country-do"],
      ["Bosnia and Herz.", "country-ba"],
      ["Macedonia", "country-mk"],
      ["Czech Rep.", "country-cz"],
      ["Czechia", "country-cz"],
    ];
    return [c.name, c];
  }),
);

// Map de alias de nombres GeoJSON → country id
const _geoNameAliases: Record<string, string> = {
  "Dem. Rep. Congo": "country-cd",
  "Central African Rep.": "country-cf",
  "Eq. Guinea": "country-gq",
  "eSwatini": "country-sz",
  "S. Sudan": "country-ss",
  "Côte d'Ivoire": "country-ci",
  "Dominican Rep.": "country-do",
  "Bosnia and Herz.": "country-ba",
  "Macedonia": "country-mk",
  "Czechia": "country-cz",
  "N. Cyprus": "",         // No está en nuestra lista
  "Somaliland": "",        // No está en nuestra lista
  "W. Sahara": "",         // No está en nuestra lista
  "Fr. S. Antarctic Lands": "", // No está en nuestra lista
  "Falkland Is.": "",      // No está en nuestra lista
  "Kosovo": "country-xk",
  "Palestine": "country-ps",
  "Taiwan": "country-tw",
  "United States of America": "country-us",
};

/** Resuelve un feature del GeoJSON al Country correspondiente */
export function resolveCountryFromFeature(feature: {
  id?: string | number;
  properties?: { name?: string };
}): Country | undefined {
  // 1. Intentar por ISO numérico
  const n3 = String(feature.id ?? "");
  if (n3 && n3 !== "-99" && countryByN3[n3]) {
    return countryByN3[n3];
  }

  // 2. Intentar por nombre (para Kosovo y otros sin id numérico)
  const name = feature.properties?.name ?? "";
  const aliasId = _geoNameAliases[name];
  if (aliasId) {
    return countryById[aliasId];
  }

  // 3. Búsqueda directa por nombre en castellano (fallback)
  return countryByName[name];
}
