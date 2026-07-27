import { SummitTracker } from "@/components/summit-tracker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "196 Países · Recorre el mundo",
  description: "Registra todos los países del mundo que has visitado. Incluye los 193 miembros de la ONU, Palestina, Taiwán y Kosovo.",
};

export default function PaisesPage() {
  return <SummitTracker mode="countries" />;
}
