# Experiences System Reference Guide

Complete reference for experience schemas, database models, and categories.

---

## 1. Experience TypeScript Types (`data/experiences.ts`)

```ts
export type SubItem = {
  id: string;    // e.g. "lion"
  name: string;  // e.g. "León"
};

export type Experience = {
  id: string;              // e.g. "exp-big-five-land"
  name: string;            // e.g. "Avistar los Big Five terrestres"
  subItems?: SubItem[];    // Optional sub-checklist
};

export type ExperienceCategory = {
  id: string;              // e.g. "cat-wildlife"
  name: string;            // e.g. "Fauna salvaje"
  iconName: string;        // Lucide icon name (e.g. "paw", "telescope")
  experiences: Experience[];
};
```

---

## 2. Predefined Categories Summary

1. **Astronomía y Geofísica** (`cat-astro-geo`):
   - Eclipse solar total (`exp-eclipse-solar`)
   - Auroras boreales (`exp-aurora`)
   - Centro galáctico Bortle 1 (`exp-bortle1`)
   - Erupción volcánica (`exp-volcano`)
   - Terremoto (`exp-earthquake`)
   - Buceo entre placas tectónicas (`exp-fault`)
   - Agua bioluminiscente (`exp-biolum-water`)
   - Caverna kárstica bioluminiscente (`exp-biolum-cave`)
   - Lago congelado (`exp-frozen-water`)
   - Glaciar y grietas (`exp-glacier`)
   - Pernoctar en desierto (`exp-desert`)
   - Paso Drake (`exp-drake`)

2. **Fauna salvaje** (`cat-wildlife`):
   - Big Five terrestres (`exp-big-five-land`): León, Elefante, Leopardo, Rinoceronte, Búfalo.
   - Big Five marinos (`exp-big-five-sea`): Ballena azul, Tiburón ballena, Orca, Manta gigante, Tiburón blanco.
   - Osos del mundo (`exp-bears`): Polar, Pardo, Negro americano, Panda gigante.
   - Grandes simios (`exp-great-apes`): Gorila de montaña, Chimpancé, Orangután.
   - Felinos salvajes (`exp-wild-cats`): Tigre de bengala, Jaguar, Puma, Guepardo, Lince ibérico.

---

## 3. Database Representation

### Record Insertion (`experience_records`)
```sql
INSERT INTO public.experience_records (
  user_id,
  experience_id,
  achieved_on,
  end_date,
  notes,
  link,
  sub_items
) VALUES (
  'user-uuid',
  'exp-big-five-land',
  '2026-06-10',
  '2026-06-15',
  'Safari en el Serengueti',
  'https://strava.com/activities/...',
  '["lion", "elephant", "leopard", "rhino", "buffalo"]'::jsonb
);
```
