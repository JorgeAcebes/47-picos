export type SubItem = {
  id: string;
  name: string;
};

export type Experience = {
  id: string;
  name: string;
  subItems?: SubItem[];
};

export type ExperienceCategory = {
  id: string;
  name: string;
  iconName: string;
  experiences: Experience[];
};

export type CustomExperience = {
  id: string;
  user_id: string;
  name: string;
  icon_name: string;
  created_at: string;
};

export const predefinedCategories: ExperienceCategory[] = [
  {
    id: "cat-astro-geo",
    name: "Astronomía y Geofísica",
    iconName: "telescope",
    experiences: [
      { id: "exp-eclipse-solar", name: "Observar un eclipse solar total" },
      { id: "exp-aurora", name: "Observar auroras boreales" },
      { id: "exp-bortle1", name: "Observar el centro galáctico (escala Bortle 1)" },
      { id: "exp-volcano", name: "Presenciar una erupción volcánica" },
      { id: "exp-earthquake", name: "Experimentar un terremoto" },
      { id: "exp-fault", name: "Bucear entre placas tectónicas" },
      { id: "exp-biolum-water", name: "Nadar en agua bioluminiscente" },
      { id: "exp-biolum-cave", name: "Explorar una caverna kárstica bioluminiscente" },
      { id: "exp-frozen-water", name: "Caminar sobre un lago congelado" },
      { id: "exp-glacier", name: "Atravesar un glaciar y sus grietas" },
      { id: "exp-desert", name: "Pernoctar al raso en un desierto" },
      { id: "exp-drake", name: "Navegar el Paso Drake" },
    ]
  },
  {
    id: "cat-wildlife",
    name: "Fauna salvaje",
    iconName: "paw",
    experiences: [
      {
        id: "exp-big-five-land",
        name: "Avistar los Big Five terrestres",
        subItems: [
          { id: "lion", name: "León" },
          { id: "elephant", name: "Elefante" },
          { id: "leopard", name: "Leopardo" },
          { id: "rhino", name: "Rinoceronte" },
          { id: "buffalo", name: "Búfalo" }
        ]
      },
      {
        id: "exp-big-five-marine",
        name: "Avistar los Big Five marinos",
        subItems: [
          { id: "shark", name: "Tiburón blanco" },
          { id: "whale", name: "Ballena franca austral" },
          { id: "seal", name: "Lobo marino del Cabo" },
          { id: "penguin", name: "Pingüino africano" },
          { id: "dolphin", name: "Delfín mular" }
        ]
      },
      {
        id: "exp-big-cats",
        name: "Avistar los 7 grandes felinos",
        subItems: [
          { id: "tiger", name: "Tigre" },
          { id: "lion", name: "León" },
          { id: "jaguar", name: "Jaguar" },
          { id: "leopard", name: "Leopardo" },
          { id: "snow-leopard", name: "Leopardo de las nieves" },
          { id: "puma", name: "Puma" },
          { id: "cheetah", name: "Guepardo" }
        ]
      },
      {
        id: "exp-great-apes",
        name: "Avistar los 4 grandes simios",
        subItems: [
          { id: "gorilla", name: "Gorila" },
          { id: "chimpanzee", name: "Chimpancé" },
          { id: "bonobo", name: "Bonobo" },
          { id: "orangutan", name: "Orangután" }
        ]
      },
      {
        id: "exp-big-four-snakes",
        name: "Avistar los Big Four de ofidios",
        subItems: [
          { id: "indian-cobra", name: "Cobra india" },
          { id: "common-krait", name: "Krait común" },
          { id: "russells-viper", name: "Víbora de Russell" },
          { id: "saw-scaled-viper", name: "Víbora de escamas garilladas" }
        ]
      },
      {
        id: "exp-big-constrictors",
        name: "Avistar las 4 grandes constrictoras",
        subItems: [
          { id: "green-anaconda", name: "Anaconda verde" },
          { id: "reticulated-python", name: "Pitón reticulada" },
          { id: "african-rock-python", name: "Pitón de Seba" },
          { id: "burmese-python", name: "Pitón birmana" }
        ]
      },
      {
        id: "exp-venomous-titans",
        name: "Avistar los 4 titanes venenosos",
        subItems: [
          { id: "king-cobra", name: "Cobra real" },
          { id: "black-mamba", name: "Mamba negra" },
          { id: "inland-taipan", name: "Taipán del interior" },
          { id: "gaboon-viper", name: "Víbora de Gabón" }
        ]
      },
      { id: "exp-blue-whale", name: "Observar la migración de la ballena azul" }
    ]
  },
  {
    id: "cat-flight",
    name: "Vuelo y aceleración",
    iconName: "plane",
    experiences: [
      { id: "exp-parachute", name: "Saltar en paracaídas" },
      { id: "exp-helicopter", name: "Volar en helicóptero" },
      { id: "exp-hot-air-balloon", name: "Volar en globo aerostático" },
      { id: "exp-orbital", name: "Presenciar un lanzamiento orbital" }
    ]
  },
  {
    id: "cat-science",
    name: "Monumentos e hitos humanos",
    iconName: "landmark",
    experiences: [
      {
        id: "exp-7-wonders",
        name: "Explorar las 7 maravillas del mundo",
        subItems: [
          { id: "chichen-itza", name: "Chichén Itzá" },
          { id: "cristo-redentor", name: "Estatua del Cristo Redentor" },
          { id: "gran-muralla", name: "Gran Muralla China" },
          { id: "machu-picchu", name: "Machu Picchu" },
          { id: "petra", name: "Petra" },
          { id: "taj-mahal", name: "Taj Mahal" },
          { id: "coliseo", name: "Coliseo" }
        ]
      },
      { id: "exp-head-of-state", name: "Saludar a un jefe de Estado" }
    ]
  }
];
