# ADR 0002: Modelo de Datos para 52 Demarcaciones Provinciales y 196 Países

- **Estado**: Aceptado
- **Fecha**: 2026-08-15

## Contexto
El reto tradicional español comprende las 50 provincias más Ceuta y Melilla (52 hitos territoriales). Sin embargo, 5 de las cumbres físicas son compartidas exactamente sobre la divisoria provincial:
1. Gorbea (Álava / Vizcaya)
2. Torre Cerredo (León / Asturias)
3. Peñalara (Madrid / Segovia)
4. Peña Trevinca (Orense / Zamora)
5. Moncayo (Soria / Zaragoza)

A nivel mundial, existen discrepancias entre el número de estados miembros de la ONU (193) y entidades reconocidas en cartografía abierta como TopoJSON/Natural Earth.

## Decisión
1. **Picos**: Mantener 52 entradas provinciales en `data/peaks.ts`, pero asociar el mismo identificador de cumbre física (`id`) en las 5 cumbres compartidas. Los cálculos de progreso y rankings deben computar cimas físicas únicas (47), garantizando que subir una cumbre compartida computa como superada en la montaña real (ver migración `008_fix_shared_peaks.sql`).
2. **Países**: Adoptar una lista de 196 países (193 miembros de la ONU + Palestina + Taiwán + Kosovo). Para Kosovo, emplear el código numérico `-99` compatible con Natural Earth y World-Atlas TopoJSON.

## Consecuencias
- **Positivas**: Representación fiel de la geografía física frente a la administrativa; total compatibilidad con mapas TopoJSON.
- **Negativas**: El código debe siempre distinguir entre total de demarcaciones (52) y cumbres físicas únicas (47).
