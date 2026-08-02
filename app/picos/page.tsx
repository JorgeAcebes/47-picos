import { SummitTracker } from "@/components/summit-tracker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "47 Picos · Alcanza la cima",
  description: "Registra los techos de las 50 provincias españolas, Ceuta y Melilla.",
};

export default function PicosPage() {
  return <SummitTracker mode="peaks" />;
}
